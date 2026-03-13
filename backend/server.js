require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ─── JSON FILE STORE (MongoDB əvəzinə) ─────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
fs.ensureDirSync(DATA_DIR);

class JsonStore {
    constructor(filePath, opts = {}) {
        this.filePath = filePath;
        this.uniqueKeys = opts.uniqueKeys || [];
        this._data = [];
        this._load();
    }

    _load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf8');
                this._data = JSON.parse(raw);
                if (!Array.isArray(this._data)) this._data = [];
            } else {
                this._data = [];
                this._save();
            }
        } catch (e) {
            console.warn(`JsonStore: ${this.filePath} oxunarkən xəta:`, e.message);
            this._data = [];
        }
    }

    _save() {
        const tmp = this.filePath + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(this._data, null, 2), 'utf8');
        fs.renameSync(tmp, this.filePath);
    }

    _genId() {
        return crypto.randomUUID();
    }

    // Simple filter matching: { key: value } — exact match
    _match(doc, filter) {
        for (const [k, v] of Object.entries(filter)) {
            if (doc[k] !== v) return false;
        }
        return true;
    }

    find(filterOrFn) {
        if (typeof filterOrFn === 'function') return this._data.filter(filterOrFn);
        if (!filterOrFn || Object.keys(filterOrFn).length === 0) return [...this._data];
        return this._data.filter(doc => this._match(doc, filterOrFn));
    }

    findOne(filterOrFn) {
        if (typeof filterOrFn === 'function') return this._data.find(filterOrFn) || null;
        if (!filterOrFn || Object.keys(filterOrFn).length === 0) return this._data[0] || null;
        return this._data.find(doc => this._match(doc, filterOrFn)) || null;
    }

    // Case-insensitive findOne by key
    findOneCI(key, value) {
        const lower = (value || '').toLowerCase();
        return this._data.find(doc => (doc[key] || '').toLowerCase() === lower) || null;
    }

    findById(id) {
        return this._data.find(doc => doc._id === id || doc._id === String(id)) || null;
    }

    insertOne(doc) {
        if (!doc._id) doc._id = this._genId();
        if (!doc.createdAt) doc.createdAt = new Date().toISOString();
        doc.updatedAt = new Date().toISOString();

        // Unique key check
        for (const key of this.uniqueKeys) {
            if (doc[key] !== undefined) {
                const existing = this._data.find(d => d[key] === doc[key]);
                if (existing) throw new Error(`Duplicate key: ${key}=${doc[key]}`);
            }
        }

        this._data.push(doc);
        this._save();
        return { ...doc };
    }

    updateOne(filter, update) {
        const doc = typeof filter === 'function'
            ? this._data.find(filter)
            : this._data.find(d => this._match(d, filter));
        if (!doc) return { matchedCount: 0, modifiedCount: 0 };
        Object.assign(doc, update, { updatedAt: new Date().toISOString() });
        this._save();
        return { matchedCount: 1, modifiedCount: 1 };
    }

    updateById(id, update) {
        const doc = this.findById(id);
        if (!doc) return null;
        Object.assign(doc, update, { updatedAt: new Date().toISOString() });
        this._save();
        return { ...doc };
    }

    // Case-insensitive update — returns updated doc or null
    updateOneCI(key, value, update) {
        const lower = (value || '').toLowerCase();
        const doc = this._data.find(d => (d[key] || '').toLowerCase() === lower);
        if (!doc) return null;
        Object.assign(doc, update, { updatedAt: new Date().toISOString() });
        this._save();
        return { ...doc };
    }

    deleteOne(filter) {
        const idx = this._data.findIndex(doc => this._match(doc, filter));
        if (idx === -1) return { deletedCount: 0 };
        this._data.splice(idx, 1);
        this._save();
        return { deletedCount: 1 };
    }

    // Case-insensitive delete
    deleteOneCI(key, value) {
        const lower = (value || '').toLowerCase();
        const idx = this._data.findIndex(doc => (doc[key] || '').toLowerCase() === lower);
        if (idx === -1) return { deletedCount: 0 };
        this._data.splice(idx, 1);
        this._save();
        return { deletedCount: 1 };
    }

    // Upsert — find by filter, update data or create new
    upsert(filter, data) {
        const existing = this.findOne(filter);
        if (existing) {
            existing.data = data;
            existing.updatedAt = new Date().toISOString();
            this._save();
            return { ...existing };
        }
        const doc = {
            ...filter,
            data,
            _id: this._genId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this._data.push(doc);
        this._save();
        return { ...doc };
    }
}

// Store instances
const contentStore = new JsonStore(path.join(DATA_DIR, 'content.json'), { uniqueKeys: ['section'] });
const userStore    = new JsonStore(path.join(DATA_DIR, 'users.json'),   { uniqueKeys: ['username'] });
const sessionStore = new JsonStore(path.join(DATA_DIR, 'sessions.json'), { uniqueKeys: ['token'] });

// ─── END JSON STORE ─────────────────────────────────────────────────────────

// Produksiyada TOKEN_SECRET mütləq təyin edilməlidir
if (process.env.NODE_ENV === 'production' && !process.env.TOKEN_SECRET) {
    console.error('CRITICAL: TOKEN_SECRET environment variable is not set! Exiting.');
    process.exit(1);
}

// httpOnly cookie seçimləri
function getAuthCookieOptions(maxAgeMs) {
    return {
        httpOnly: true,                          // JS ilə oxunmur (XSS qorunması)
        secure: isProd,                          // Produksiyada yalnız HTTPS
        sameSite: isProd ? 'strict' : 'lax',    // CSRF qorunması
        maxAge: maxAgeMs,
        path: '/'
    };
}

// Cookie-dən auth tokenini oxu
function getTokenFromRequest(req) {
    const cookieToken = req.cookies && req.cookies.auth_token;
    if (cookieToken) return cookieToken;
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.split(' ')[1];
    return null;
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration (env-aware)
const isProd = process.env.NODE_ENV === 'production';
const envAllowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const devDefaults = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];
const allowedOrigins = isProd ? envAllowed : [...new Set([...envAllowed, ...devDefaults])];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) ||
        allowedOrigins.some(allowedOrigin => origin.startsWith(allowedOrigin.replace('*', '')))) {
      return callback(null, true);
    }
    console.log('CORS blocked for origin:', origin);
    return callback(new Error('CORS not allowed for this origin'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires', 'Accept', 'Accept-Language'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// Rate limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çox sayda sorğu. Bir müddət sonra cəhd edin.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çox sayda giriş cəhdi. 15 dəqiqə sonra cəhd edin.' }
});

app.use(globalLimiter);
app.use('/api/login', authLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---------- Content Endpoints ----------
app.get('/api/content/:section', (req, res) => {
    try {
        const section = (req.params.section || '').trim().toLowerCase();
        if (!section) return res.status(400).json({ error: 'Bölmə adı tələb olunur' });

        let content = contentStore.findOne({ section });

        // Provide sane defaults if not present
        if (!content) {
            if (section === 'homepage') {
                content = {
                    section,
                    data: {
                        hero: {
                            title: 'Grand Telecom - Sürətli İnternet Həllləri',
                            subtitle: 'Yüksək keyfiyyətli internet və rabitə xidmətləri',
                            description: 'Azərbaycanda ən sürətli və etibarlı internet xidməti təqdim edirik.',
                            button_text: 'Tariflərə bax',
                            background_image: ''
                        },
                        alert: null
                    }
                };
            } else if (section === 'services') {
                content = {
                    section,
                    data: { title: 'Xidmətlərimiz', subtitle: 'Sizə təklif etdiyimiz xidmətlər', items: [] }
                };
            } else if (section === 'contact') {
                content = {
                    section,
                    data: { phone: '+994 12 555 00 00', email: 'info@grandtelecom.az', address: 'Bakı şəhəri', hours: 'Hər gün 09:00-18:00' }
                };
            } else {
                content = { section, data: {} };
            }
        }

        return res.json(content.data || {});
    } catch (error) {
        console.error('Get content error:', error);
        return res.status(500).json({ error: 'Server xətası' });
    }
});

// Helper middleware: admin or superadmin only
function adminOrSuper(req, res, next) {
    try {
        const role = (req.user && req.user.role || '').toLowerCase();
        if (role === 'admin' || role === 'superadmin') return next();
        return res.status(403).json({ error: 'Bu əməliyyat üçün icazəniz yoxdur' });
    } catch (e) {
        return res.status(403).json({ error: 'Bu əməliyyat üçün icazəniz yoxdur' });
    }
}

// Upsert content for a section (admin panel)
app.put('/api/content/:section', authMiddleware, adminOrSuper, (req, res) => {
    try {
        const section = (req.params.section || '').trim().toLowerCase();
        const payload = req.body || {};
        if (!section) return res.status(400).json({ error: 'Bölmə adı tələb olunur' });

        const updated = contentStore.upsert({ section }, payload);
        return res.json({ message: 'Məzmun yeniləndi', section, data: updated.data || {} });
    } catch (error) {
        console.error('Upsert content error:', error);
        return res.status(500).json({ error: 'Server xətası' });
    }
});

// Upsert content via POST as well (compatibility for admin-panel save)
app.post('/api/content/:section', authMiddleware, adminOrSuper, (req, res) => {
    try {
        const section = (req.params.section || '').trim().toLowerCase();
        const payload = req.body || {};
        if (!section) return res.status(400).json({ error: 'Bölmə adı tələb olunur' });

        const updated = contentStore.upsert({ section }, payload);
        return res.json({ message: 'Məzmun yeniləndi', section, data: updated.data || {} });
    } catch (error) {
        console.error('Upsert content (POST) error:', error);
        return res.status(500).json({ error: 'Server xətası' });
    }
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ msg: 'Backend is running and CORS is enabled ✅' });
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
]);

function fileFilter(req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Yalnız şəkil faylları icazə verilir (JPEG, PNG, GIF, WebP, SVG)'), false);
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Password strength requirement (must match frontend config.js VALIDATION_RULES.PASSWORD)
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Environment variables for superadmin
const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME || 'Timur';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'TE07102024';

// Allow multiple aliases for superadmin username (case-insensitive)
const SUPERADMIN_ALIASES = new Set([
  (SUPERADMIN_USERNAME || '').toLowerCase(),
  'superadmin',
  'admin',
  'timur'
]);

// Auth functions
function generateToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const data = `${token}:${timestamp}`;
    const signature = crypto.createHmac('sha256', process.env.TOKEN_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-only-insecure-secret' : (() => { throw new Error('TOKEN_SECRET not set'); })()))
                         .update(data)
                         .digest('hex');
    return `${token}.${timestamp}.${signature}`;
}

function verifyToken(token) {
    try {
        const [tokenPart, timestamp, signature] = token.split('.');
        if (!tokenPart || !timestamp || !signature) return false;

        const tokenAge = Date.now() - parseInt(timestamp, 10);
        const maxAge = 24 * 60 * 60 * 1000;
        if (tokenAge > maxAge) return false;

        const data = `${tokenPart}:${timestamp}`;
        const expectedSignature = crypto.createHmac('sha256', process.env.TOKEN_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-only-insecure-secret' : (() => { throw new Error('TOKEN_SECRET not set'); })()))
                                     .update(data)
                                     .digest('hex');

        return signature === expectedSignature;
    } catch (error) {
        console.error('Token yoxlanılarkən xəta:', error);
        return false;
    }
}

function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

async function hashPasswordBcrypt(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(user, password) {
    if (!user || !user.passwordHash) return false;
    if (typeof user.passwordHash === 'string' && user.passwordHash.startsWith('$2')) {
        try {
            return await bcrypt.compare(password, user.passwordHash);
        } catch (e) {
            return false;
        }
    }
    try {
        const hashed = hashPassword(password, user.salt || '');
        return hashed === user.passwordHash;
    } catch (e) {
        return false;
    }
}

// Strip sensitive fields from user doc before sending to client
function safeUser(doc) {
    if (!doc) return null;
    const { passwordHash, salt, __v, ...safe } = doc;
    return safe;
}

const activeTokens = new Map();

// Auth middleware
async function authMiddleware(req, res, next) {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Giriş tələb olunur',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!verifyToken(token)) {
            return res.status(401).json({
                success: false,
                error: 'Yanlış token',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        // Check in-memory cache
        let tokenData = activeTokens.get(token);

        // Fallback: check persistent session store
        if (!tokenData) {
            try {
                const sessionDoc = sessionStore.findOne({ token });
                if (sessionDoc) {
                    tokenData = {
                        userId: sessionDoc.userId,
                        username: sessionDoc.username,
                        role: sessionDoc.role,
                        firstName: sessionDoc.firstName,
                        lastName: sessionDoc.lastName,
                        email: sessionDoc.email,
                        phoneNumber: sessionDoc.phoneNumber,
                        isActive: sessionDoc.isActive,
                        expiresAt: sessionDoc.expiresAt,
                        lastLogin: sessionDoc.lastLogin
                    };
                    activeTokens.set(token, tokenData);
                }
            } catch (e) {
                console.warn('Session lookup failed:', e?.message || e);
            }
        }

        if (!tokenData) {
            return res.status(401).json({
                success: false,
                error: 'Yanlış token',
                code: 'INVALID_TOKEN'
            });
        }

        // Check expiry
        const currentTime = Date.now();
        if (tokenData.expiresAt < currentTime) {
            activeTokens.delete(token);
            try { sessionStore.deleteOne({ token }); } catch(_) {}
            return res.status(401).json({
                success: false,
                error: 'Session müddəti bitib, yenidən daxil olun',
                code: 'TOKEN_EXPIRED'
            });
        }

        // Sliding expiration
        tokenData.expiresAt = currentTime + (24 * 60 * 60 * 1000);
        activeTokens.set(token, tokenData);
        try { sessionStore.updateOne({ token }, { expiresAt: tokenData.expiresAt }); } catch(_) {}

        req.user = tokenData;
        const userData = tokenData;

        // Superadmin bypasses user DB check
        if (userData.userId === 'superadmin-id' || userData.role === 'superadmin') {
            req.user = {
                id: 'superadmin-id',
                username: (userData.username || SUPERADMIN_USERNAME || 'superadmin').toLowerCase(),
                role: 'superadmin',
                firstName: 'Super',
                lastName: 'Admin',
                email: 'superadmin@example.com',
                phoneNumber: '+994 XX XXX XX XX',
                isActive: true
            };
            return next();
        }

        // Get fresh user data from store
        const userId = userData.userId || userData.id;
        const user = userStore.findById(userId);
        if (!user || user.blocked) {
            activeTokens.delete(token);
            return res.status(401).json({ error: 'İstifadəçi tapılmadı və ya bloklanıb' });
        }

        req.user = {
            id: user._id,
            username: user.username,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            isActive: user.isActive
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Server xətası' });
    }
}

// Superadmin only middleware
const superAdminOnly = (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Bu əməliyyat üçün icazəniz yoxdur' });
    }
    next();
};

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, remember } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'İstifadəçi adı və şifrə tələb olunur',
                code: 'MISSING_CREDENTIALS'
            });
        }

        console.log('Login attempt for user:', username);
        const normalizedUsername = username.trim().toLowerCase();

        // Super admin login
        if (SUPERADMIN_ALIASES.has(normalizedUsername)) {
            const passwordMatch = crypto.timingSafeEqual(
                Buffer.from(password),
                Buffer.from(SUPERADMIN_PASSWORD)
            );
            if (passwordMatch) {
                console.log('Superadmin login detected');

                const userData = {
                    _id: 'superadmin-id',
                    username: normalizedUsername,
                    role: 'superadmin',
                    firstName: 'Super',
                    lastName: 'Admin',
                    email: 'superadmin@example.com',
                    phoneNumber: '+994 XX XXX XX XX',
                    isActive: true,
                    lastLogin: new Date().toISOString()
                };

                const token = generateToken();
                const tokenExpiry = remember
                    ? Date.now() + (30 * 24 * 60 * 60 * 1000)
                    : Date.now() + (24 * 60 * 60 * 1000);

                const sessionPayload = {
                    userId: 'superadmin-id',
                    username: userData.username,
                    role: 'superadmin',
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    isActive: true,
                    expiresAt: tokenExpiry,
                    lastLogin: userData.lastLogin
                };
                activeTokens.set(token, sessionPayload);
                try { sessionStore.insertOne({ token, ...sessionPayload }); } catch (e) { console.warn('Session create failed (superadmin):', e?.message || e); }

                console.log('Superadmin uğurla daxil oldu');

                const cookieMaxAge = tokenExpiry - Date.now();
                res.cookie('auth_token', token, getAuthCookieOptions(cookieMaxAge));

                return res.json({
                    success: true,
                    token,
                    user: userData,
                    expiresIn: cookieMaxAge
                });
            } else {
                console.log('Yanlış superadmin şifrəsi');
                return res.status(401).json({
                    success: false,
                    error: 'Yanlış istifadəçi adı və ya şifrə',
                    code: 'INVALID_CREDENTIALS'
                });
            }
        }

        // Normal user login
        try {
            const user = userStore.findOneCI('username', normalizedUsername);

            if (!user) {
                console.log('İstifadəçi tapılmadı:', normalizedUsername);
                return res.status(401).json({
                    success: false,
                    error: 'Yanlış istifadəçi adı və ya şifrə',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            if (user.blocked) {
                console.log('İstifadəçi bloklanıb:', normalizedUsername);
                return res.status(403).json({
                    success: false,
                    error: 'Hesabınız bloklanıb. Zəhmət olmasa administratorla əlaqə saxlayın.',
                    code: 'ACCOUNT_BLOCKED'
                });
            }

            const isPasswordValid = await verifyPassword(user, password);
            if (!isPasswordValid) {
                console.log('Yanlış şifrə cəhdi:', normalizedUsername);
                return res.status(401).json({
                    success: false,
                    error: 'Yanlış istifadəçi adı və ya şifrə',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Update last login
            const lastLogin = new Date();
            userStore.updateById(user._id, { lastLogin: lastLogin.toISOString() });

            const token = generateToken();
            const tokenExpiry = remember
                ? Date.now() + (30 * 24 * 60 * 60 * 1000)
                : Date.now() + (24 * 60 * 60 * 1000);

            const sessionPayload = {
                userId: user._id,
                username: user.username.toLowerCase(),
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                isActive: user.isActive,
                expiresAt: tokenExpiry,
                lastLogin: lastLogin.toISOString()
            };
            activeTokens.set(token, sessionPayload);
            try { sessionStore.insertOne({ token, ...sessionPayload }); } catch (e) { console.warn('Session create failed:', e?.message || e); }

            console.log('Uğurlu giriş:', normalizedUsername);

            const cookieMaxAge = tokenExpiry - Date.now();
            res.cookie('auth_token', token, getAuthCookieOptions(cookieMaxAge));

            return res.json({
                success: true,
                token,
                user: {
                    _id: user._id,
                    username: user.username,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    isActive: user.isActive,
                    lastLogin: lastLogin.toISOString()
                },
                expiresIn: cookieMaxAge
            });

        } catch (error) {
            console.error('Giriş zamanı xəta:', error);
            return res.status(500).json({
                success: false,
                error: 'Daxili server xətası',
                code: 'INTERNAL_SERVER_ERROR'
            });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
});

// Get current user info
app.get('/api/auth/me', authMiddleware, (req, res) => {
    try {
        if (req.user && req.user.id === 'superadmin-id') {
            return res.json({
                _id: 'superadmin-id',
                username: (req.user.username || SUPERADMIN_USERNAME || 'superadmin').toLowerCase(),
                role: 'superadmin',
                firstName: 'Super',
                lastName: 'Admin',
                email: 'superadmin@example.com',
                phoneNumber: '+994 XX XXX XX XX',
                isActive: true
            });
        }

        const user = userStore.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
        }

        res.json(safeUser(user));
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
});

// Logout
async function handleLogout(req, res) {
    try {
        const token = getTokenFromRequest(req);
        if (token) {
            activeTokens.delete(token);
            try { sessionStore.deleteOne({ token }); } catch(_) {}
        }
        res.clearCookie('auth_token', { httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax', path: '/' });
        res.json({ message: 'Uğurla çıxış edildi' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
}

app.post('/api/logout', authMiddleware, handleLogout);
app.post('/api/auth/logout', authMiddleware, handleLogout);

// Verify token validity
app.get('/api/auth/verify', authMiddleware, (req, res) => {
    try {
        return res.json({ ok: true, user: req.user });
    } catch (error) {
        console.error('Auth verify error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
});

// Refresh token endpoint
app.post('/api/auth/refresh', authMiddleware, (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const oldToken = auth.startsWith('Bearer ') ? auth.split(' ')[1] : '';
        if (!oldToken) {
            return res.status(401).json({ error: 'Token tapılmadı' });
        }

        let existing = activeTokens.get(oldToken);
        if (!existing) {
            try {
                const sessionDoc = sessionStore.findOne({ token: oldToken });
                if (sessionDoc) {
                    existing = {
                        userId: sessionDoc.userId,
                        username: sessionDoc.username,
                        role: sessionDoc.role,
                        firstName: sessionDoc.firstName,
                        lastName: sessionDoc.lastName,
                        email: sessionDoc.email,
                        phoneNumber: sessionDoc.phoneNumber,
                        isActive: sessionDoc.isActive,
                        expiresAt: sessionDoc.expiresAt,
                        lastLogin: sessionDoc.lastLogin
                    };
                    activeTokens.set(oldToken, existing);
                }
            } catch (e) {
                console.warn('Session lookup (refresh) failed:', e?.message || e);
            }
        }
        if (!existing) {
            return res.status(401).json({ error: 'Yanlış token' });
        }

        const newToken = generateToken();
        const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);

        const newPayload = {
            userId: existing.userId || existing.id || (req.user && (req.user.userId || req.user.id)),
            username: existing.username || (req.user && req.user.username) || '',
            role: existing.role || (req.user && req.user.role) || 'user',
            firstName: existing.firstName || (req.user && req.user.firstName) || '',
            lastName: existing.lastName || (req.user && req.user.lastName) || '',
            email: existing.email || (req.user && req.user.email) || '',
            phoneNumber: existing.phoneNumber || (req.user && req.user.phoneNumber) || '',
            isActive: existing.isActive !== undefined ? existing.isActive : (req.user && req.user.isActive) !== false,
            expiresAt: tokenExpiry,
            lastLogin: existing.lastLogin || new Date().toISOString()
        };

        activeTokens.set(newToken, newPayload);
        activeTokens.delete(oldToken);
        try {
            sessionStore.deleteOne({ token: oldToken });
            sessionStore.insertOne({ token: newToken, ...newPayload });
        } catch (e) {
            console.warn('Session rotate failed:', e?.message || e);
        }

        const userResp = {
            _id: newPayload.userId || 'superadmin-id',
            username: (newPayload.username || '').toLowerCase(),
            role: newPayload.role,
            firstName: newPayload.firstName,
            lastName: newPayload.lastName,
            email: newPayload.email,
            phoneNumber: newPayload.phoneNumber,
            isActive: newPayload.isActive
        };

        const newCookieMaxAge = tokenExpiry - Date.now();
        res.cookie('auth_token', newToken, getAuthCookieOptions(newCookieMaxAge));

        return res.json({
            success: true,
            token: newToken,
            user: userResp,
            expiresIn: newCookieMaxAge
        });
    } catch (error) {
        console.error('Auth refresh error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
});

// Create new user (superadmin only)
app.post('/api/users', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        console.log('Received request to create user:', req.body);
        const { username, password, role, email, firstName, lastName } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: 'İstifadəçi adı, şifrə və rol tələb olunur' });
        }

        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({ error: 'Şifrə ən azı 8 simvoldan ibarət olmalı, böyük hərf, kiçik hərf, rəqəm və xüsusi simvol ehtiva etməlidir' });
        }

        // Check if user already exists (case-insensitive)
        const existingUser = userStore.findOneCI('username', username);
        if (existingUser) {
            return res.status(400).json({ error: 'Bu istifadəçi adı artıq istifadə olunub' });
        }

        // Create new user with bcrypt hash
        const passwordHash = await hashPasswordBcrypt(password);

        const user = userStore.insertOne({
            username,
            passwordHash,
            role,
            email: email || '',
            firstName: firstName || '',
            lastName: lastName || '',
            isActive: true,
            blocked: false,
            lastLogin: null
        });

        console.log('User saved successfully');

        res.status(201).json({
            message: 'İstifadəçi uğurla yaradıldı',
            user: safeUser(user)
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            error: 'Server xətası',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get all users (admin only)
app.get('/api/users', authMiddleware, (req, res) => {
    try {
        const currentUser = req.user;
        const currentUserRole = currentUser.role.toLowerCase();

        if (currentUserRole === 'user') {
            return res.status(403).json({ error: 'Bu əməliyyat üçün icazəniz yoxdur' });
        }

        let users;
        if (currentUserRole === 'superadmin') {
            users = userStore.find({});
        } else {
            users = userStore.find(doc => doc.role !== 'superadmin');
        }

        // Remove sensitive fields and sort by createdAt descending
        users = users
            .map(u => safeUser(u))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.json(users);
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
});

// Update user (superadmin only)
app.patch('/api/users/:username', authMiddleware, superAdminOnly, (req, res) => {
    try {
        const username = req.params.username;
        const { role, blocked } = req.body;

        // Prevent modifying protected superadmin
        if (username.toLowerCase() === SUPERADMIN_USERNAME.toLowerCase()) {
            return res.status(403).json({
                error: `'${SUPERADMIN_USERNAME}' istifadəçisi mütləq mühafizə olunub. Bu istifadəçinin məlumatları dəyişdirilə bilməz.`
            });
        }

        const updateFields = {};
        if (blocked !== undefined) updateFields.blocked = blocked;
        if (role !== undefined) updateFields.role = role;

        const updated = userStore.updateOneCI('username', username, updateFields);
        if (!updated) {
            return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
        }

        res.json(safeUser(updated));
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
});

// Change user password (superadmin only)
app.patch('/api/users/:username/password', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        const username = req.params.username;
        const { newPassword } = req.body || {};

        if (!newPassword || !PASSWORD_REGEX.test(newPassword)) {
            return res.status(400).json({ error: 'Şifrə ən azı 8 simvoldan ibarət olmalı, böyük hərf, kiçik hərf, rəqəm və xüsusi simvol ehtiva etməlidir' });
        }

        if (username.toLowerCase() === SUPERADMIN_USERNAME.toLowerCase()) {
            return res.status(403).json({
                error: `'${SUPERADMIN_USERNAME}' istifadəçisinin şifrəsi bu üsulla dəyişdirilə bilməz. Xüsusi prosedur tələb olunur.`
            });
        }

        const user = userStore.findOneCI('username', username);
        if (!user) {
            return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
        }

        const passwordHash = await hashPasswordBcrypt(newPassword);

        userStore.updateById(user._id, { passwordHash, salt: null });

        res.json({ message: 'Şifrə uğurla dəyişdirildi' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
});

// Delete user (superadmin only)
app.delete('/api/users/:username', authMiddleware, superAdminOnly, (req, res) => {
    try {
        const username = req.params.username;

        if (username.toLowerCase() === SUPERADMIN_USERNAME.toLowerCase()) {
            return res.status(403).json({
                error: 'Bu istifadəçi mühafizə olunub və silinə bilməz.'
            });
        }

        const result = userStore.deleteOneCI('username', username);
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
        }

        res.json({ message: 'İstifadəçi uğurla silindi' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
});

// Initialize default content if not exists
function initializeContent() {
    try {
        const existing = contentStore.findOne({ section: 'about' });
        if (!existing) {
            const aboutContent = {
                title: 'Haqqımızda',
                description: 'Grand Telecom haqqında məlumat',
                content: 'Biz rabitə xidmətləri təqdim edən aparıcı şirkətik.',
                image: '/images/about.jpg',
                features: [
                    '10 ildən çox təcrübə',
                    'Peşəkar komanda',
                    'Müştəri məmnuniyyəti'
                ]
            };
            contentStore.upsert({ section: 'about' }, aboutContent);
        }
        console.log('Content initialized');
    } catch (error) {
        console.error('Error initializing content:', error);
    }
}

// Initialize content at startup
initializeContent();

// File upload endpoints
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Fayl göndərilməyib' });
        }
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ url: fileUrl, filename: req.file.filename, path: `/uploads/${req.file.filename}` });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
});

app.post('/api/upload/image', authMiddleware, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Fayl göndərilməyib' });
        }
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ url: fileUrl, filename: req.file.filename, path: `/uploads/${req.file.filename}` });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server xətası' });
    }
});

// Serve static frontend files
const publicDir = path.join(__dirname, '..');
app.use(express.static(publicDir));

// SPA fallback
app.get('*', (req, res, next) => {
    try {
        if (req.path && req.path.startsWith('/api/')) return next();
        res.sendFile(path.join(publicDir, 'index.html'));
    } catch (e) {
        next(e);
    }
});

// 404 handler for API routes
app.use((req, res, next) => {
    if (req.path && req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Marşrut tapılmadı' });
    }
    return next();
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const status = err.status || 500;
    const message = err.message || 'Server xətası';
    res.status(status).json({ error: message });
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
