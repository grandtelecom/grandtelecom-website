// Admin Panel JavaScript
(function() {
    // Check if already initialized
    if (window.adminInitialized) return;
    window.adminInitialized = true;

    // Elegant toast notifications (override window.alert)
    (function initNotifier() {
        if (window.__notifierInitialized__) return;
        window.__notifierInitialized__ = true;
        // Container
        const container = document.createElement('div');
        container.id = 'gt-toast-container';
        document.body.appendChild(container);
        // Styles
        const style = document.createElement('style');
        style.textContent = `
            #gt-toast-container { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; pointer-events: none; }
            .gt-toast { pointer-events: auto; min-width: 300px; max-width: 520px; padding: 14px 16px; border-radius: 12px; color: #0b1b2b; box-shadow: 0 18px 40px rgba(0,0,0,0.18); backdrop-filter: blur(8px); display: flex; align-items: start; gap: 12px; border: 1px solid; animation: gt-fade-in 160ms ease-out; background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.92)); }
            .gt-toast .gt-icon { font-size: 18px; line-height: 1; }
            .gt-toast .gt-msg { flex: 1; font-size: 15px; }
            .gt-toast .gt-close { background: transparent; border: 0; cursor: pointer; color: inherit; font-size: 18px; }
            .gt-toast.info { border-color: #90CAF9; }
            .gt-toast.success { border-color: #81C784; }
            .gt-toast.warn { border-color: #FFD54F; }
            .gt-toast.error { border-color: #EF9A9A; }
            @keyframes gt-fade-in { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `;
        document.head.appendChild(style);

        function iconFor(type) {
            switch (type) {
                case 'success': return '✅';
                case 'warn': return '⚠️';
                case 'error': return '⛔';
                default: return 'ℹ️';
            }

    // Wire up create user action (superadmin only)
    function initCreateUser() {
        const btn = document.getElementById('create-user');
        if (!btn || btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', async () => {
            try {
                const firstName = (document.getElementById('new-user-firstname')?.value || '').trim();
                const lastName = (document.getElementById('new-user-lastname')?.value || '').trim();
                const phone = (document.getElementById('new-user-phone')?.value || '').trim();
                const username = (document.getElementById('new-user-username')?.value || '').trim();
                const password = (document.getElementById('new-user-password')?.value || '').trim();
                let role = (document.getElementById('new-user-role')?.value || '').trim();

                // Map UI role values to backend-accepted ones. Admin -> admin, others kept as-is.
                const roleMap = { 'Admin': 'admin', 'admin': 'admin' };
                role = roleMap[role] || role; // keep PR/Marketing/SMM as-is
                if (!role) { role = 'user'; }

                if (!username || !password || !role) {
                    window.toast && window.toast.warn ? window.toast.warn('Zəhmet olmasa tələb olunan xanaları doldurun') : alert('Zəhmet olmasa tələb olunan xanaları doldurun');
                    return;
                }

                // Basic UX: disable button while saving
                const originalHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Yaradılır...';

                const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
                const resp = await fetch(`${API_BASE_URL}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        username,
                        password,
                        role,
                        firstName,
                        lastName,
                        email: '',
                        phoneNumber: phone
                    })
                });

                if (!resp.ok) {
                    let msg = `HTTP ${resp.status}`;
                    try {
                        const ct = resp.headers.get('content-type') || '';
                        if (ct.includes('application/json')) {
                            const j = await resp.json();
                            msg = j.error || j.message || msg;
                        } else {
                            const t = await resp.text();
                            msg = t || msg;
                        }
                    } catch(_) {}
                    throw new Error(msg);
                }

                window.toast && window.toast.success ? window.toast.success('İstifadəçi yaradıldı') : alert('İstifadəçi yaradıldı');
                // Clear inputs
                ['new-user-firstname','new-user-lastname','new-user-phone','new-user-username','new-user-password'].forEach(id => {
                    const el = document.getElementById(id); if (el) el.value = '';
                });
                const roleSel = document.getElementById('new-user-role'); if (roleSel) roleSel.value = '';

                // Refresh list
                loadUsers();
            } catch (e) {
                console.error('Create user failed:', e);
                const msg = e && e.message ? e.message : 'İstifadəçi yaradılarkən xəta baş verdi';
                if (window.toast && window.toast.error) {
                    window.toast.error(msg);
                } else {
                    alert(msg);
                }
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        });
    }

    // Profile dropdown logic
    function initProfileDropdown() {
        const btn = document.getElementById('avatarBtn');
        const dropdown = document.getElementById('profileDropdown');
        if (!btn || !dropdown) return;

        // Populate profile info from storage
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const nameEl = document.getElementById('profile-name');
            const roleEl = document.getElementById('profile-role');
            const userEl = document.getElementById('profile-username');
            const avatarEl = document.getElementById('profile-avatar');
            const initials = (user.fullName || user.username || 'GT').toString().trim().split(/\s+/).map(s=>s[0]).join('').slice(0,2).toUpperCase();
            if (nameEl) nameEl.textContent = user.fullName || user.username || 'İstifadəçi';
            if (roleEl) roleEl.textContent = (user.role ? user.role.toUpperCase() : 'USER');
            if (userEl) userEl.textContent = user.username ? ('@' + user.username) : '@user';
            if (avatarEl) avatarEl.textContent = initials;
            const avatarInline = document.getElementById('user-avatar');
            if (avatarInline) avatarInline.textContent = initials;
        } catch(_) {}

        function closeAll() { dropdown.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); }
        function toggle() {
            const isOpen = dropdown.style.display === 'block';
            dropdown.style.display = isOpen ? 'none' : 'block';
            btn.setAttribute('aria-expanded', String(!isOpen));
        }

        btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== btn) closeAll();
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    // Backend-ə logout sorğusu göndər — httpOnly cookie-ni server silir
                    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
                    await fetch(`${API_BASE_URL}/api/auth/logout`, {
                        method: 'POST',
                        credentials: 'include', // cookie göndərilsin
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                    }).catch(() => {});
                } catch(_) {}
                // localStorage-ı da təmizlə (köhnə data)
                try {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('token');
                    localStorage.removeItem('auth_user');
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('user');
                    localStorage.removeItem('username');
                    localStorage.removeItem('fullName');
                    localStorage.removeItem('session');
                    localStorage.removeItem('tokenExpiresAt');
                    sessionStorage.clear();
                } catch(_) {}
                window.location.href = 'login.html';
            });
        }
    }
        }
        function showToast(type, message, timeout = 3500) {
            const wrap = document.createElement('div');
            wrap.className = `gt-toast ${type}`;
            wrap.innerHTML = `<div class="gt-icon">${iconFor(type)}</div><div class="gt-msg"></div><button class="gt-close" aria-label="Bağla">×</button>`;
            wrap.querySelector('.gt-msg').textContent = String(message || '');
            const close = () => { if (!wrap.parentNode) return; wrap.style.opacity = '0'; wrap.style.transform = 'translateY(-6px)'; setTimeout(() => wrap.remove(), 180); };
            wrap.querySelector('.gt-close').addEventListener('click', close);
            container.appendChild(wrap);
            if (timeout > 0) setTimeout(close, timeout);
        }

        // Public helpers
        window.toast = {
            info: (m, t) => showToast('info', m, t),
            success: (m, t) => showToast('success', m, t),
            warn: (m, t) => showToast('warn', m, t),
            error: (m, t) => showToast('error', m, t)
        };
        // Route default alert() to our toast for consistency
        const nativeAlert = window.alert.bind(window);
        window.alert = function(msg) { try { showToast('info', msg); } catch(_) { nativeAlert(msg); } };
    })();

    // API Configuration
    const API_BASE_URL = (window.CONFIG && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL.replace(/\/api$/, '') : 'http://localhost:3001';
    const API_ENDPOINTS = {
        USERS: `${API_BASE_URL}/api/users`,
        AUTH: `${API_BASE_URL}/api/auth`
    };

    // Manual role permissions (overridable via localStorage.GT_PERMISSIONS)
    const DEFAULT_PERMISSIONS = {
        superadmin: {
            tabs: ['dashboard','about','services','tariffs','posts','contact','users','profile'],
            actions: { users: { changePassword: true, block: true, delete: true } }
        },
        admin: {
            // Admin bütün bölmələrə girə bilər
            tabs: ['dashboard','about','services','tariffs','posts','contact','users','profile'],
            actions: { users: { changePassword: true, block: true, delete: false } }
        },
        pr: {
            // PR yalnız Xəbərlər (posts)
            tabs: ['posts'],
            actions: { users: { changePassword: false, block: false, delete: false } }
        },
        marketing: {
            // Marketing yalnız Tariflər (tariffs)
            tabs: ['tariffs'],
            actions: { users: { changePassword: false, block: false, delete: false } }
        },
        smm: {
            tabs: ['dashboard','posts','contact','profile'],
            actions: { users: { changePassword: false, block: false, delete: false } }
        },
        user: {
            tabs: ['dashboard','profile'],
            actions: { users: { changePassword: false, block: false, delete: false } }
        }
    };

    function getPermissions() {
        try {
            const raw = localStorage.getItem('GT_PERMISSIONS');
            if (!raw) return DEFAULT_PERMISSIONS;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : DEFAULT_PERMISSIONS;
        } catch(_) { return DEFAULT_PERMISSIONS; }
    }
    function getRole() {
        const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return (localStorage.getItem('auth_role') || cu.role || 'user').toLowerCase();
    }
    function canAccessTab(tabId) {
        const role = getRole();
        const perms = getPermissions();
        const allow = perms[role]?.tabs || [];
        return allow.includes(tabId);
    }
    function canDo(section, action, { username } = {}) {
        const role = getRole();
        const perms = getPermissions();
        const sect = (perms[role]?.actions || {})[section] || {};
        // Own-account exception for password change
        if (section === 'users' && action === 'changePassword' && username) {
            const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (cu.username && cu.username === username) return true;
        }
        return !!sect[action];
    }

    // Global error handling
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Global error:', {message, source, lineno, colno, error});
        return true; // Prevent default error handler
    };

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        event.preventDefault();
    });

    // Prevent form resubmission
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Admin panel initializing...');
        
        // NOTE: Back/forward naviqasiyasını zorla bloklamaq refresh loop yaradırdı
        // Aşağıdakı blok deaktiv edildi ki, səhifə tez-tez yenilənməsin
        // if (window.history && window.history.replaceState) {
        //     window.history.replaceState(null, null, window.location.href);
        //     window.onpopstate = function() {
        //         history.go(1);
        //     };
        // }

        // Prevent form submission
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
        });

        // Initialize tabs
        initTabs();
        // Initialize profile dropdown (guarded, may be removed from DOM)
        if (typeof initProfileDropdown === 'function') {
            try { initProfileDropdown(); } catch(_) {}
        }
        
        // Wire up create user button if present
        initCreateUser();
        
        // Load initial data
        checkAuth();
        
        console.log('Admin panel initialized');
    });

    // Initialize tabs
    function initTabs() {
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                const tabId = this.getAttribute('data-tab');
                try {
                    // Update URL hash and persist last tab
                    if (tabId) {
                        if (location.hash !== '#' + tabId) {
                            location.hash = tabId;
                        }
                        try { sessionStorage.setItem('lastTab', tabId); localStorage.setItem('lastTab', tabId); } catch(_) {}
                    }
                } catch(_) {}
                switchTab(tabId);
            });
        });

        // Do not activate a tab here to avoid double switch flicker.
        // Activation is handled after auth in checkAuth().
    }

    // Switch between tabs
    function switchTab(tabId) {
        // Əgər istənilən tab artıq aktivdirsə, təkrar emal etmə
        const activeContent = document.getElementById(tabId);
        if (activeContent && activeContent.classList.contains('active')) {
            return;
        }

        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Deactivate all tab links
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Permission check
        if (!canAccessTab(tabId)) {
            window.toast?.warn?.('Bu bölməyə giriş hüququnuz yoxdur');
            return;
        }
        // Activate current tab
        const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
        // activeContent artıq yuxarıda elan olunub
        
        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');

        // Persist last tab and update hash for refresh/deep-link support
        try {
            if (tabId) {
                if (location.hash !== '#' + tabId) {
                    location.hash = tabId;
                }
                try { sessionStorage.setItem('lastTab', tabId); localStorage.setItem('lastTab', tabId); } catch(_) {}
            }
        } catch(_) {}
        
        // Load tab specific content
        if (tabId === 'users') {
            const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
            const role = localStorage.getItem('auth_role');
            if (!token) {
                console.warn('İcazə yoxdur: daxil olmadan İstifadəçilər siyahısı göstərilə bilməz.');
                // Optional: show a gentle notice in the UI if container exists
                const tbody = document.querySelector('#users-table tbody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="8" style="color:#c00;">Giriş tələb olunur. Zəhmət olmasa əvvəlcə sistemə daxil olun.</td></tr>';
                }
            } else if (role && !['superadmin','admin'].includes(role.toLowerCase())) {
                console.warn('Bu bölməyə yalnız admin və ya superadmin çıxışı var.');
                const tbody = document.querySelector('#users-table tbody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="8">Bu bölməyə yalnız admin və ya superadmin çıxışı var.</td></tr>';
                }
            } else {
                loadUsers();
            }
        }
    }

    // Check authentication
    async function checkAuth() {
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.endsWith('login.html');
        
        // Check if we have a token in storage
        const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
        
        // If no token and not on login page, redirect to login
        if (!token) {
            if (!isLoginPage) {
                console.warn('Auth token tapılmadı. Login səhifəsinə yönləndirilir...');
                // Clear any existing user data
                localStorage.removeItem('currentUser');
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
            return false;
        }
        
        // If we're on the login page but have a token, redirect to admin panel
        if (isLoginPage) {
            console.log('Artıq daxil olunub. Admin panelinə yönləndirilir...');
            window.location.href = 'admin-panel.html';
            return true;
        }
        
        // Verify the token with the server
        try {
            // Use ApiClient to verify the token
            const userData = await window.apiClient.get('auth/me');
            
            if (userData && userData.username) {
                // Store user data in localStorage and persist role for later checks
                localStorage.setItem('currentUser', JSON.stringify(userData));
                try { localStorage.setItem('auth_role', (userData.role || '').toLowerCase()); } catch(_) {}
                
                // Check role-based access
                const urlParams = new URLSearchParams(window.location.search);
                const tabParam = urlParams.get('tab');
                const hashTab = (location.hash || '').replace('#','');
                const storedTab = sessionStorage.getItem('lastTab') || localStorage.getItem('lastTab');
                const desiredTab = tabParam || hashTab || storedTab || 'dashboard';

                // If trying to access users tab but not an admin
                if (desiredTab === 'users' && !['superadmin', 'admin'].includes(userData.role?.toLowerCase())) {
                    console.warn('Bu bölməyə giriş qadağandır. Dashboard-a yönləndirilir...');
                    window.toast.warn('Bu bölməyə giriş hüququnuz yoxdur');
                    window.location.href = 'admin-panel.html?tab=dashboard';
                    return false;
                }
                
                // Hide unauthorized tabs in UI
                document.querySelectorAll('[data-tab]').forEach(a => {
                    const t = a.getAttribute('data-tab');
                    if (!canAccessTab(t)) { a.style.display = 'none'; }
                });

                // Everything is fine: open allowed tab (fallback to first allowed)
                if (!canAccessTab(desiredTab)) {
                    const role = getRole();
                    const firstAllowed = (getPermissions()[role]?.tabs || ['dashboard'])[0] || 'dashboard';
                    switchTab(firstAllowed);
                } else {
                    switchTab(desiredTab);
                }
                return true;
            } else {
                // Invalid user data, try refresh sequence
                throw new Error('Invalid user data received');
            }
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            
            // Try to refresh token once before logging out
            try {
                const refreshResp = await window.apiClient.request('/auth/refresh', { method: 'POST' });
                if (refreshResp && (refreshResp.ok === true || refreshResp.success === true || refreshResp.token)) {
                    // Save new token if provided
                    if (refreshResp.token) {
                        try { localStorage.setItem('auth_token', refreshResp.token); localStorage.setItem('authToken', refreshResp.token); } catch(_) {}
                    }
                    // Retry fetching user info
                    const retryUser = await window.apiClient.get('auth/me');
                    if (retryUser && retryUser.username) {
                        localStorage.setItem('currentUser', JSON.stringify(retryUser));
                        const urlParams = new URLSearchParams(window.location.search);
                        const tabParam = urlParams.get('tab');
                        switchTab(tabParam || 'dashboard');
                        return true;
                    }
                }
            } catch (re) {
                console.warn('Token refresh attempt failed:', re);
            }

            // Auth failed and refresh also failed: clear session and redirect to login
            try {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('authToken');
                localStorage.removeItem('token');
                localStorage.removeItem('auth_user');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('user');
                localStorage.removeItem('username');
                localStorage.removeItem('fullName');
                localStorage.removeItem('session');
                localStorage.removeItem('tokenExpiresAt');
                sessionStorage.clear();
            } catch(_) {}
            if (!isLoginPage) {
                window.toast && window.toast.warn && window.toast.warn('Sessiya etibarsızdır. Yenidən daxil olun.');
                setTimeout(() => { window.location.href = 'login.html'; }, 800);
            }
            return false;
        }
    }

    // Load users
    async function loadUsers() {
        console.log('Loading users...');
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const tbody = document.querySelector('#users-table tbody');
        
        // Show loading state
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yüklənir...</span></div></td></tr>';
        }

        // If we are in offline-dev mode, show local users
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        if (token === 'offline-dev' || window.__API_OFFLINE__ === true) {
            if (tbody) {
                // Add superadmin user
                const superAdminUser = {
                    id: 1,
                    username: 'Timur',
                    fullName: 'Timur Eminli',
                    phone: '504520055',
                    role: 'superadmin',
                    blocked: false,
                    createdAt: '2024-10-07T00:00:00.000Z' // 07.10.2024
                };
                
                // If current user is not set, use superadmin as default
                if (!currentUser.username) {
                    localStorage.setItem('currentUser', JSON.stringify(superAdminUser));
                }
                
                renderUsers([superAdminUser]);
            }
        }
        
        try {
            // Use the ApiClient to make the request
            const users = await window.apiClient.get('users');
            
            // Add superadmin user if not exists
            const superAdminExists = users.some(u => u.role === 'superadmin');
            if (!superAdminExists) {
                const superAdminUser = {
                    id: 1,
                    username: 'Timur',
                    fullName: 'Timur Eminli',
                    phone: '504520055',
                    role: 'superadmin',
                    blocked: false,
                    createdAt: '2024-10-07T00:00:00.000Z' // 07.10.2024
                };
                users.unshift(superAdminUser); // Add to the beginning of the array
            }
            
            renderUsers(users);
            
        } catch (error) {
            console.error('Error loading users:', error);
            
            // Handle specific error cases
            if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
                window.toast.error('Sessiya bitdi. Zəhmət olmasa yenidən daxil olun.');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="8" class="text-danger">Sessiyanın müddəti bitdi. Zəhmət olmasa yenidən daxil olun.</td></tr>';
                }
                // Redirect to login after a delay
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                return;
            }
            
            if (error.message.includes('403') || error.message.toLowerCase().includes('forbidden')) {
                // Even if we get 403, we'll show the superadmin user in read-only mode
                const superAdminUser = {
                    id: 1,
                    username: 'Timur',
                    fullName: 'Timur Eminli',
                    phone: '504520055',
                    role: 'superadmin',
                    blocked: false,
                    createdAt: '2024-10-07T00:00:00.000Z',
                    readOnly: true // Mark as read-only
                };
                renderUsers([superAdminUser]);
                window.toast.warn('Sizə yalnız məlumatları görmək icazəsi verilib.');
                return;
            }
            
            // For other errors, show a generic error message
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-danger">Xəta baş verdi: ${error.message}. Zəhmət olmasa yenidən yoxlayın.</td></tr>`;
            }
            window.toast.error(`Xəta baş verdi: ${error.message}`);
        }
    }

    // Render users table
    function renderUsers(users) {
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Get current user's info and role
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const currentUserRole = (currentUser.role || '').toLowerCase();
        const isCurrentUserSuperAdmin = currentUserRole === 'superadmin';
        const isCurrentUserAdminOrSuper = currentUserRole === 'superadmin' || currentUserRole === 'admin';
        
        // Check if we're in read-only mode (for 403 Forbidden case)
        const isReadOnly = users.length === 1 && users[0].readOnly === true;
        
        // Sort users: superadmins first, then by username
        const sortedUsers = [...users].sort((a, b) => {
            if (a.role === 'superadmin' && b.role !== 'superadmin') return -1;
            if (a.role !== 'superadmin' && b.role === 'superadmin') return 1;
            return (a.username || '').localeCompare(b.username || '');
        });
        
        // Update users count badge based on what will be displayed
        try {
            const countEl = document.getElementById('users-count');
            if (countEl) {
                countEl.textContent = String(sortedUsers.length);
            }
        } catch(_) {}

        sortedUsers.forEach(user => {
            const tr = document.createElement('tr');
            const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString() : '';
            const status = user.blocked ? '<span class="badge bg-danger">Bloklu</span>' : '<span class="badge bg-success">Aktiv</span>';
            const rawRole = (user.role || '').toLowerCase();
            const isSuper = rawRole === 'superadmin';
            
            // Format role display
            let roleBadge = '';
            if (isSuper) {
                roleBadge = '<span class="badge bg-primary">Super Admin</span>';
            } else if (rawRole === 'admin') {
                roleBadge = '<span class="badge bg-info text-dark">Admin</span>';
            } else {
                roleBadge = '<span class="badge bg-secondary">İstifadəçi</span>';
            }
            
            // Format full name (support multiple backend key variants, including nested)
            const first = user.firstName 
                || user.firstname 
                || user.first_name 
                || (user.profile && (user.profile.firstName || user.profile.firstname || user.profile.first_name))
                || user.ad
                || user.name 
                || '';
            const last  = user.lastName  
                || user.lastname  
                || user.last_name  
                || (user.profile && (user.profile.lastName || user.profile.lastname || user.profile.last_name || user.profile.surname))
                || user.soyad
                || user.surname 
                || user.last 
                || '';
            const fullName = user.fullName 
                || user.fullname 
                || user.full_name 
                || (user.profile && (user.profile.fullName || user.profile.fullname || user.profile.full_name))
                || [first, last].filter(Boolean).join(' ')
                || user.username 
                || '—';
            
            // Format phone number (support various keys, nested and arrays)
            let phoneRaw = user.phoneNumber 
                || user.phone 
                || user.phone_number
                || user.mobile
                || user.msisdn
                || (user.contactPhone) 
                || (user.contact && (user.contact.phone 
                    || (Array.isArray(user.contact.phones) && (typeof user.contact.phones[0] === 'string' ? user.contact.phones[0] : (user.contact.phones[0]?.number || user.contact.phones[0]?.value)))))
                || (user.profile && (user.profile.phone 
                    || (Array.isArray(user.profile.phones) && (typeof user.profile.phones[0] === 'string' ? user.profile.phones[0] : (user.profile.phones[0]?.number || user.profile.phones[0]?.value)))))
                || (Array.isArray(user.phones) && (typeof user.phones[0] === 'string' ? user.phones[0] : (user.phones[0]?.number || user.phones[0]?.value)))
                || '';
            let phone = '—';
            if (phoneRaw) {
                const cleaned = String(phoneRaw).replace(/\D/g, '');
                if (cleaned.length === 9) {
                    phone = `+994 ${cleaned.slice(0,3)} ${cleaned.slice(3,5)} ${cleaned.slice(5,7)} ${cleaned.slice(7,9)}`;
                } else if (cleaned.length === 10 && cleaned.startsWith('0')) {
                    const nine = cleaned.slice(1);
                    phone = `+994 ${nine.slice(0,3)} ${nine.slice(3,5)} ${nine.slice(5,7)} ${nine.slice(7,9)}`;
                } else if (cleaned.length === 12 && cleaned.startsWith('994')) {
                    const nine = cleaned.slice(3);
                    phone = `+994 ${nine.slice(0,3)} ${nine.slice(3,5)} ${nine.slice(5,7)} ${nine.slice(7,9)}`;
                } else {
                    // Fallback: show original
                    phone = String(phoneRaw);
                }
            }
            
            // Action buttons
            let actionButtons = '';
            
            // If we're in read-only mode, show a message instead of action buttons
            if (isReadOnly) {
                actionButtons = '<span class="text-muted">Yalnız oxu rejimi</span>';
            } else {
                // Password change button (show for all users, but with different permissions)
                const canChangePassword = canDo('users','changePassword', { username: user.username });
                
                if (canChangePassword) {
                    actionButtons += `
                        <button class="btn btn-sm btn-primary me-1 mb-1 edit-user" 
                                data-username="${user.username}" 
                                title="Şifrəni dəyiş">
                            <i class="fas fa-key"></i>
                        </button>`;
                }
                
                // Block/Unblock button (not for superadmins). Allow for admin and superadmin.
                if (!isSuper && canDo('users','block', { username: user.username })) {
                    const blockBtnClass = user.blocked ? 'btn-success' : 'btn-warning';
                    const blockBtnIcon = user.blocked ? 'unlock' : 'lock';
                    const blockBtnTitle = user.blocked ? 'Blokdan çıxar' : 'Blokla';
                    
                    actionButtons += `
                        <button class="btn btn-sm ${blockBtnClass} me-1 mb-1 toggle-block" 
                                data-username="${user.username}" 
                                data-blocked="${!!user.blocked}"
                                title="${blockBtnTitle}">
                            <i class="fas fa-${blockBtnIcon}"></i>
                        </button>`;
                }
                
                // Delete button (yalnız superadmin), not for superadmins and not for current user
                if (!isSuper && canDo('users','delete', { username: user.username }) && currentUser.username !== user.username) {
                    actionButtons += `
                        <button class="btn btn-sm btn-danger delete-user me-1 mb-1" 
                                data-username="${user.username}"
                                title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>`;
                }
            }
            
            tr.innerHTML = `
                <td>${user.id || '—'}</td>
                <td>
                    <div class="fw-bold">${user.username || '—'}</div>
                    <small class="text-muted">${user.email || ''}</small>
                </td>
                <td>${fullName}</td>
                <td>${phone}</td>
                <td>${roleBadge}</td>
                <td>${status}</td>
                <td>${createdAt}</td>
                <td>
                    <div class="d-flex flex-wrap">
                        ${actionButtons || '<span class="text-muted">—</span>'}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Delegate actions to tbody (edit password, toggle block, delete)
        tbody.onclick = async function(e) {
            const btn = e.target.closest('button');
            if (!btn) return;
            const uname = btn.getAttribute('data-username');
            if (!uname) return;
            const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
            if (!token) { alert('Giriş tələb olunur.'); return; }

            try {
                // Change password
                if (btn.classList.contains('edit-user')) {
                    // Set the username in the modal
                    document.getElementById('modal-username').textContent = uname;
                    
                    // Show the modal
                    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
                    modal.show();
                    
                    // Focus the password field when modal is shown
                    const passwordInput = document.getElementById('new-password');
                    const saveBtn = document.getElementById('save-password-btn');
                    const strengthBar = document.getElementById('password-strength-bar');
                    const strengthText = document.getElementById('password-strength-text');
                    
                    // Reset modal state
                    passwordInput.value = '';
                    saveBtn.disabled = true;
                    strengthBar.style.width = '0%';
                    strengthBar.className = 'progress-bar';
                    strengthText.textContent = 'Şifrə gücü: zəif';
                    
                    // Update password requirements
                    ['length', 'uppercase', 'number'].forEach(id => {
                        const el = document.getElementById(`req-${id}`);
                        el.classList.remove('valid');
                        el.querySelector('i').className = 'fas fa-circle me-1';
                        el.querySelector('i').style.fontSize = '0.5rem';
                    });
                    
                    // Handle password input
                    const checkPasswordStrength = () => {
                        const password = passwordInput.value;
                        let strength = 0;
                        let requirementsMet = 0;
                        
                        // Length requirement
                        const hasMinLength = password.length >= 8;
                        if (hasMinLength) {
                            strength += 30;
                            requirementsMet++;
                            document.getElementById('req-length').classList.add('valid');
                            document.getElementById('req-length').querySelector('i').className = 'fas fa-check-circle me-1 text-success';
                        } else {
                            document.getElementById('req-length').classList.remove('valid');
                            document.getElementById('req-length').querySelector('i').className = 'fas fa-circle me-1';
                        }
                        
                        // Uppercase requirement
                        const hasUppercase = /[A-Z]/.test(password);
                        if (hasUppercase) {
                            strength += 30;
                            requirementsMet++;
                            document.getElementById('req-uppercase').classList.add('valid');
                            document.getElementById('req-uppercase').querySelector('i').className = 'fas fa-check-circle me-1 text-success';
                        } else {
                            document.getElementById('req-uppercase').classList.remove('valid');
                            document.getElementById('req-uppercase').querySelector('i').className = 'fas fa-circle me-1';
                        }
                        
                        // Number requirement
                        const hasNumber = /\d/.test(password);
                        if (hasNumber) {
                            strength += 30;
                            requirementsMet++;
                            document.getElementById('req-number').classList.add('valid');
                            document.getElementById('req-number').querySelector('i').className = 'fas fa-check-circle me-1 text-success';
                        } else {
                            document.getElementById('req-number').classList.remove('valid');
                            document.getElementById('req-number').querySelector('i').className = 'fas fa-circle me-1';
                        }
                        
                        // Special characters (bonus)
                        if (/[^A-Za-z0-9]/.test(password)) {
                            strength += 10;
                        }
                        
                        // Update strength bar
                        strength = Math.min(100, strength);
                        strengthBar.style.width = `${strength}%`;
                        
                        // Update strength text and color
                        if (strength < 30) {
                            strengthBar.className = 'progress-bar bg-danger';
                            strengthText.textContent = 'Şifrə gücü: zəif';
                        } else if (strength < 70) {
                            strengthBar.className = 'progress-bar bg-warning';
                            strengthText.textContent = 'Şifrə gücü: orta';
                        } else {
                            strengthBar.className = 'progress-bar bg-success';
                            strengthText.textContent = 'Şifrə gücü: güclü';
                        }
                        
                        // Enable/disable save button based on requirements
                        saveBtn.disabled = requirementsMet < 3 || password.length < 8;
                    };
                    
                    // Add event listeners
                    passwordInput.addEventListener('input', checkPasswordStrength);
                    
                    // Handle save button click
                    saveBtn.onclick = async () => {
                        const newPwd = passwordInput.value.trim();
                        if (!newPwd) return;
                        
                        try {
                            saveBtn.disabled = true;
                            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Yadda saxlanılır...';
                            
                            const resp = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(uname)}/password`, {
                                method: 'PATCH',
                                headers: { 
                                    'Authorization': `Bearer ${token}`, 
                                    'Content-Type': 'application/json' 
                                },
                                body: JSON.stringify({ newPassword: newPwd })
                            });
                            
                            if (!resp.ok) {
                                const t = await resp.text();
                                throw new Error(t || `HTTP ${resp.status}`);
                            }
                            
                            // Show success toast
                            const toast = document.createElement('div');
                            toast.className = 'modern-toast success';
                            toast.innerHTML = `
                                <div class="toast-icon">✓</div>
                                <div class="toast-content">
                                    <div class="toast-title">Uğurlu</div>
                                    <div class="toast-message">Şifrə uğurla dəyişdirildi</div>
                                </div>
                                <button class="toast-close">&times;</button>
                            `;
                            
                            document.body.appendChild(toast);
                            
                            // Auto remove after 5 seconds
                            setTimeout(() => {
                                toast.classList.add('hide');
                                setTimeout(() => toast.remove(), 300);
                            }, 5000);
                            
                            // Close button functionality
                            const closeBtn = toast.querySelector('.toast-close');
                            closeBtn.addEventListener('click', () => {
                                toast.classList.add('hide');
                                setTimeout(() => toast.remove(), 300);
                            });
                            
                            // Close the modal
                            modal.hide();
                            
                        } catch (err) {
                            console.error('Password change failed:', err);
                            alert('Xəta: ' + (err?.message || 'Şifrə dəyişdirilə bilmədi'));
                            saveBtn.disabled = false;
                            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Yadda saxla';
                        }
                    };
                    
                    return;
                }

                // Toggle block
                if (btn.classList.contains('toggle-block')) {
                    const currentlyBlocked = btn.getAttribute('data-blocked') === 'true';
                    const nextState = !currentlyBlocked;
                    const resp = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(uname)}`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ blocked: nextState })
                    });
                    if (!resp.ok) {
                        const t = await resp.text();
                        throw new Error(t || `HTTP ${resp.status}`);
                    }
                    // Refresh list
                    loadUsers();
                    return;
                }

                // Delete user
                if (btn.classList.contains('delete-user')) {
                    if (!confirm(`\"${uname}\" istifadəçisini silmək istədiyinizə əminsiniz?`)) return;
                    const resp = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(uname)}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!resp.ok) {
                        const t = await resp.text();
                        throw new Error(t || `HTTP ${resp.status}`);
                    }
                    // Refresh list
                    loadUsers();
                    return;
                }
            } catch (err) {
                console.error('User action failed:', err);
                alert('Xəta: ' + (err?.message || 'əməliyyat yerinə yetirilmədi'));
            }
        };
    }

    // Ensure ApiClient instance exists early
    (function ensureApiClient() {
        try {
            if (window.ApiClient && !window.apiClient) {
                // Pass string base URL as constructor expects
                window.apiClient = new ApiClient(API_BASE_URL);
            } else if (!window.ApiClient) {
                console.warn('ApiClient class is not loaded yet. Make sure js/apiClient.new.js is included before admin.js');
            }
        } catch (e) {
            console.error('Failed to initialize ApiClient:', e);
        }
    })();

    // Initialize Create User handler
    function initCreateUser() {
        const btn = document.getElementById('create-user');
        if (!btn) return;
        // Helpers for inline errors
        const ensureErrorEl = (el) => {
            if (!el) return null;
            let err = el.parentElement?.querySelector('.field-error');
            if (!err) {
                err = document.createElement('div');
                err.className = 'field-error';
                // style injected once
                if (!document.getElementById('gt-field-error-style')) {
                    const st = document.createElement('style');
                    st.id = 'gt-field-error-style';
                    st.textContent = `
                        .field-error {
                            color: #dc3545;
                            font-size: 12px;
                            margin-top: 4px;
                            display: block;
                            min-height: 18px;
                        }
                        .field-ok {
                            color: #28a745;
                            font-size: 12px;
                            margin-top: 4px;
                        }
                        .form-control.is-invalid {
                            border-color: #dc3545;
                            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23dc3545'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e");
                            background-repeat: no-repeat;
                            background-position: right calc(0.375em + 0.1875rem) center;
                            background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
                        }
                        .form-control:focus.is-invalid {
                            border-color: #dc3545;
                            box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
                        }
                    `;
                    document.head.appendChild(st);
                }
                el.parentElement?.appendChild(err);
            }
            return err;
        };
        const setFieldError = (el, msg) => {
            const err = ensureErrorEl(el);
            if (!err) return;
            err.textContent = msg || '';
            err.className = 'field-error';
            if (el) {
                el.classList.add('is-invalid');
                el.classList.remove('is-valid');
            }
        };
        const clearFieldError = (el) => {
            if (!el) return;
            const err = el.parentElement?.querySelector('.field-error');
            if (err) {
                err.textContent = '';
                err.className = 'field-error';
            }
            el.classList.remove('is-invalid', 'is-valid');
        };
        const setFieldOk = (el, msg) => {
            const err = ensureErrorEl(el);
            if (!err) return;
            err.textContent = msg || '';
            err.className = 'field-ok';
            if (el) {
                el.classList.remove('is-invalid');
                el.classList.add('is-valid');
            }
        };

        btn.addEventListener('click', async function() {
            // Düzgün token adı ilə əldə edirik
            const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
            const myRole = (localStorage.getItem('auth_role') || '').toLowerCase();
            if (!token) {
                // inline not possible here; use toast/alert fallback
                toast?.warn?.('Giriş tələb olunur. Zəhmət olmasa əvvəlcə sistemə daxil olun.');
                return;
            }
            if (myRole !== 'superadmin') {
                toast?.warn?.('Yalnız superadmin istifadəçi yarada bilər.');
                return;
            }
            if (token === 'offline-dev' || window.__API_OFFLINE__ === true) {
                toast?.warn?.('Offline rejimdə istifadəçi yaratmaq mümkün deyil. Zəhmət olmasa backend-i işə salın və yenidən daxil olun.');
                const warn = document.getElementById('users-warning');
                if (warn) warn.style.display = 'block';
                return;
            }

            const usernameEl = document.getElementById('new-user-username');
            const passwordEl = document.getElementById('new-user-password');
            const roleEl = document.getElementById('new-user-role');

            // İstifadəçi adını alıb təmizləyirik
            let username = (usernameEl?.value || '').trim();
            
            // İnput sahəsini təzələyirik (yalnız hərf və rəqəmlər qalsın)
            if (usernameEl) {
                usernameEl.value = username;
                clearFieldError(usernameEl);
            }
            
            // Digər sahələrin dəyərlərini alırıq
            const password = (passwordEl?.value || '').trim();
            const role = (roleEl?.value || '').trim();
            
            // Əvvəlki xəta mesajlarını təmizləyirik
            clearFieldError(usernameEl); 
            clearFieldError(passwordEl); 
            clearFieldError(roleEl);
            
            // Boş sahələri yoxlayırıq
            let hasError = false;
            
            // İstifadəçi adının doğrulanması
            if (!username) {
                setFieldError(usernameEl, 'İstifadəçi adını daxil edin');
                hasError = true;
            } else if (username.length < 3) {
                setFieldError(usernameEl, 'İstifadəçi adı ən azı 3 simvol olmalıdır');
                hasError = true;
            } else if (!/^[A-Za-z0-9]+$/.test(username)) {
                setFieldError(usernameEl, 'Yalnız hərf və rəqəmdən istifadə edin');
                hasError = true;
            } else if (!/[A-Za-z]/.test(username)) {
                setFieldError(usernameEl, 'İstifadəçi adında ən azı 1 hərf olmalıdır');
                hasError = true;
            }
            
            // Telefon nömrəsinin doğrulanması
            const phoneEl = document.getElementById('new-user-phone');
            const phone = (phoneEl?.value || '').trim();
            
            if (phoneEl) {
                clearFieldError(phoneEl);
                
                if (!phone) {
                    setFieldError(phoneEl, 'Əlaqə nömrəsini daxil edin');
                    hasError = true;
                } else if (phone.length !== 9) {
                    setFieldError(phoneEl, 'Əlaqə nömrəsi 9 rəqəm olmalıdır');
                    hasError = true;
                } else if (phone.startsWith('0')) {
                    setFieldError(phoneEl, 'Əlaqə nömrəsi 0 ilə başlaya bilməz');
                    hasError = true;
                } else if (!/^[0-9]+$/.test(phone)) {
                    setFieldError(phoneEl, 'Yalnız rəqəmlər daxil edin');
                    hasError = true;
                }
            }
            
            // Digər validasiyalar
            const allowedRoles = ['Admin','Marketing','PR','SMM'];
            const passRe = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
            
            // Rol validasiyası
            if (!role) {
                setFieldError(roleEl, 'Rol seçilməlidir');
                hasError = true;
            } else if (!allowedRoles.some(r => r.toLowerCase() === role.toLowerCase())) {
                setFieldError(roleEl, `Rol yalnız: ${allowedRoles.join(', ')}`);
                hasError = true;
            }
            
            // Şifrə validasiyası
            if (!password) {
                setFieldError(passwordEl, 'Şifrə tələb olunur');
                hasError = true;
            } else if (!passRe.test(password)) {
                setFieldError(passwordEl, 'Şifrə: ən az 8 simvol, hərf və rəqəm olmalıdır');
                hasError = true;
            }
            
            // Əgər xəta varsa, ilk xəta olan sahəyə fokuslaş
            if (hasError) {
                const firstError = document.querySelector('.is-invalid');
                if (firstError) firstError.focus();
                return;
            }

            try {
                // Map UI role to backend enum
                const backendRole = (role || '').toLowerCase() === 'admin' ? 'admin' : 'user';
                const resp = await fetch(API_ENDPOINTS.USERS, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password, role: backendRole })
                });

                if (resp.status === 401) {
                    setFieldError(usernameEl, 'Sessiya bitib. Yenidən daxil olun.');
                    try { localStorage.removeItem('auth_token'); localStorage.removeItem('authToken'); } catch(_) {}
                    return;
                }
                if (resp.status === 403) { setFieldError(roleEl, 'Bu əməliyyatı yerinə yetirmək üçün icazəniz yoxdur (403).'); return; }
                if (resp.status === 409) { setFieldError(usernameEl, 'Bu istifadəçi adı artıq mövcuddur.'); return; }
                if (!resp.ok) {
                    const t = await resp.text();
                    setFieldError(usernameEl, t || `Xəta: HTTP ${resp.status}`);
                    return;
                }

                // Clear form
                if (usernameEl) usernameEl.value = '';
                if (passwordEl) passwordEl.value = '';
                if (roleEl) roleEl.value = '';
                
                // Show modern toast notification
                const toast = document.createElement('div');
                toast.className = 'modern-toast success';
                toast.innerHTML = `
                    <div class="toast-icon">✓</div>
                    <div class="toast-content">
                        <div class="toast-title">Uğurlu</div>
                        <div class="toast-message">İstifadəçi uğurla yaradıldı</div>
                    </div>
                    <button class="toast-close">&times;</button>
                `;
                
                document.body.appendChild(toast);
                
                // Auto remove after 5 seconds
                setTimeout(() => {
                    toast.classList.add('hide');
                    setTimeout(() => toast.remove(), 300);
                }, 5000);
                
                // Close button functionality
                const closeBtn = toast.querySelector('.toast-close');
                closeBtn.addEventListener('click', () => {
                    toast.classList.add('hide');
                    setTimeout(() => toast.remove(), 300);
                });
                
                // Refresh user list
                try { loadUsers(); } catch(_) {}
            } catch (err) {
                console.error('Create user failed:', err);
                setFieldError(usernameEl, 'İstifadəçi yaratmaq alınmadı: ' + (err?.message || 'naməlum xəta'));
            }
        });
    }

    // Load user profile data
    async function loadUserProfile() {
        try {
            const username = localStorage.getItem('username');
            if (!username) {
                console.error('Username not found in localStorage');
                return;
            }

            // Show loading states
            const fullNameEl = document.getElementById('profile-fullname');
            const phoneEl = document.getElementById('profile-phone');
            const lastLoginEl = document.getElementById('last-login');
            const userAvatar = document.getElementById('user-avatar');
            
            if (fullNameEl) fullNameEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Yüklənir...';
            if (phoneEl) phoneEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Yüklənir...';
            if (lastLoginEl) lastLoginEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Yoxlanılır...';

            // Check if user is superadmin
            const isSuperadmin = (username || '').toLowerCase() === 'superadmin' ||
                                 (username || '').toLowerCase() === 'admin' ||
                                 (username || '').toLowerCase() === 'timur';
            
            let userData;
            
            if (isSuperadmin) {
                // For superadmin, use hardcoded values
                userData = {
                    fullName: 'Super Admin',
                    phone: '+994 XX XXX XX XX',
                    role: 'superadmin',
                    lastLogin: new Date().toLocaleString('az-AZ')
                };
                
                // Update avatar with 'SA' for Super Admin
                if (userAvatar) {
                    userAvatar.textContent = 'SA';
                    userAvatar.style.backgroundColor = '#1976D2';
                    userAvatar.style.color = 'white';
                    userAvatar.style.display = 'flex';
                    userAvatar.style.alignItems = 'center';
                    userAvatar.style.justifyContent = 'center';
                    userAvatar.style.fontWeight = 'bold';
                }
            } else {
                // For regular users, try to get from localStorage or use defaults
                userData = {
                    fullName: localStorage.getItem('fullName') || 'Ad Soyad',
                    phone: localStorage.getItem('phone') || '+994 XX XXX XX XX',
                    role: localStorage.getItem('auth_role') || 'admin',
                    lastLogin: localStorage.getItem('lastLogin') || new Date().toLocaleString('az-AZ')
                };
            }

            // Update UI with user data
            if (fullNameEl) fullNameEl.innerHTML = `<span>${userData.fullName}</span>`;
            if (phoneEl) phoneEl.innerHTML = `<span>${userData.phone}</span>`;
            if (lastLoginEl) {
                lastLoginEl.innerHTML = `
                    <i class="fas fa-check-circle me-1" style="color: #28a745;"></i>
                    <span>${userData.lastLogin}</span>
                `;
            }
            
            // Update last login time
            const now = new Date().toLocaleString('az-AZ');
            localStorage.setItem('lastLogin', now);
            
            // Also update the header if needed
            const lastLoginHeaderEl = document.getElementById('last-login-header');
            if (lastLoginHeaderEl) {
                lastLoginHeaderEl.textContent = `Son giriş: ${now}`;
            }
            
        } catch (error) {
            console.error('Error loading user profile:', error);
            toast.error('Profil məlumatları yüklənərkən xəta baş verdi');
            
            // Show error states
            const fullNameEl = document.getElementById('profile-fullname');
            const phoneEl = document.getElementById('profile-phone');
            const lastLoginEl = document.getElementById('last-login');
            
            if (fullNameEl) fullNameEl.innerHTML = '<span class="text-danger">Xəta baş verdi</span>';
            if (phoneEl) phoneEl.innerHTML = '<span class="text-danger">Xəta baş verdi</span>';
            if (lastLoginEl) lastLoginEl.innerHTML = '<span class="text-danger">Xəta baş verdi</span>';
        }
    }

    // Initialize user avatar with profile modal
    function initUserAvatar() {
        console.log('Initializing user avatar with profile modal...');
        
        // Get username from localStorage, fallback to URL params, then to 'Admin'
        let username = localStorage.getItem('username') || 
                      new URLSearchParams(window.location.search).get('username') || 
                      'Admin';
        
        // Normalize username
        username = username.trim().toLowerCase();
        console.log('Current username:', username);
        
        // Check if superadmin
        const isSuperadmin = username === 'superadmin' || username === 'admin' || username === 'timur';
        console.log('Is superadmin:', isSuperadmin);
        
        // Get all avatar elements
        const avatarElements = [
            document.getElementById('avatar-btn'),
            document.getElementById('user-avatar'),
            document.getElementById('dropdown-avatar')
        ].filter(Boolean);
        
        console.log('Found avatar elements:', avatarElements);
        
        // Keep existing dropdown menus intact so avatar remains interactive
        
        // Update avatar appearance and keep click handler intact
        avatarElements.forEach(el => {
            // Prefer full name initials or username initials
            let stored = {};
            try { stored = JSON.parse(localStorage.getItem('currentUser') || '{}') || {}; } catch(_) {}
            const firstName = stored.firstName || stored.fullName?.split(' ')[0] || username || '';
            const lastName = stored.lastName || (stored.fullName?.split(' ')[1] || '');
            const avatarUrl = stored.avatarUrl || '';
            const initials = (`${(firstName||'').charAt(0)}${(lastName||'').charAt(0)}` || (username||'A').charAt(0)).toUpperCase();

            // Color palette fallback
            const colors = ['#2E7D32', '#D32F2F', '#7B1FA2', '#00796B', '#5D4037', '#0288D1', '#C2185B'];
            const key = (firstName + lastName || username || 'a');
            const colorIndex = key.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length;

            // If we have an avatar image, try to use background image on the button/span container
            if (avatarUrl) {
                // For the small header avatar, set background on the button
                if (el.id === 'user-avatar') {
                    const btn = document.getElementById('avatar-btn');
                    if (btn) {
                        btn.style.backgroundImage = `url('${avatarUrl}')`;
                        btn.style.backgroundSize = 'cover';
                        btn.style.backgroundPosition = 'center';
                        el.textContent = '';
                    }
                } else {
                    // For other elements (like dropdown-avatar), clear text and let CSS/image handle appearance
                    try {
                        el.style.backgroundImage = `url('${avatarUrl}')`;
                        el.style.backgroundSize = 'cover';
                        el.style.backgroundPosition = 'center';
                    } catch(_) {}
                    if (el.textContent) el.textContent = '';
                }
            } else {
                // No image: show initials and apply deterministic background color
                el.style.backgroundImage = '';
                el.style.backgroundColor = colors[colorIndex];
                if (el.id === 'user-avatar') {
                    el.textContent = initials;
                } else {
                    // If element contains child span, prefer updating it
                    const span = el.querySelector('span');
                    if (span) span.textContent = initials; else el.textContent = initials;
                }
            }
            
            // Apply common styles
            Object.assign(el.style, {
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                fontSize: '16px',
                cursor: 'pointer',
                border: 'none',
                outline: 'none',
                padding: 0,
                margin: 0,
                pointerEvents: 'auto'
            });
            // Preserve existing click handlers to keep avatar active
        });
        
        // Remove any other profile elements that might show user info
        const profileElements = [
            document.getElementById('profile-info-section'),
            document.querySelector('.user-profile'),
            document.querySelector('.profile-dropdown')
        ];
        
        profileElements.forEach(el => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        
        console.log('Avatar initialization complete');
            /* function toggleUserDropdown(e) {
                if (e) e.stopPropagation();
                if (!dropdown) return;
                const isVisible = window.getComputedStyle(dropdown).display === 'block';
                dropdown.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) { loadUserProfile(); }
            }
            if (avatarBtn) avatarBtn.addEventListener('click', toggleUserDropdown);
            if (userAvatar) userAvatar.addEventListener('click', toggleUserDropdown);
            if (userProfile) userProfile.addEventListener('click', toggleUserDropdown);
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!dropdown) return;
                const clickedTrigger = (avatarBtn && (e.target === avatarBtn || avatarBtn.contains(e.target))) ||
                                        (userAvatar && (e.target === userAvatar || userAvatar.contains(e.target))) ||
                                        (userProfile && userProfile.contains(e.target));
                if (!dropdown.contains(e.target) && !clickedTrigger) {
                    dropdown.style.display = 'none';
                }
            });
            
            // Close dropdown when clicking on a tab
            document.querySelectorAll('.tab-link').forEach(tab => {
                tab.addEventListener('click', function() {
                    if (dropdown) dropdown.style.display = 'none';
                });
            });
            
            // Handle logout from dropdown
            if (dropdownLogout) {
                dropdownLogout.addEventListener('click', function(e) {
                    e.preventDefault();
                    const logoutBtn = document.getElementById('logout');
                    if (logoutBtn) logoutBtn.click();
                });
            }
            
            // Password change via Modal
            const changePasswordBtn = document.getElementById('change-password-btn');
            const editProfileBtn = document.getElementById('edit-profile-btn');
            const modalEl = document.getElementById('changePasswordModal');
            const newPasswordInput = modalEl ? modalEl.querySelector('#new-password') : null;
            const confirmPasswordInput = modalEl ? modalEl.querySelector('#confirm-password') : null; // may not exist in modal
            const currentPasswordInput = modalEl ? modalEl.querySelector('#current-password') : null; // may not exist in modal
            const savePasswordBtn = document.getElementById('save-password-btn');
            const cancelPasswordChange = null; // no cancel inside inline section anymore
            const profileInfoSection = document.getElementById('profile-info-section');
            const passwordChangeSection = null; // removed inline section

            // Fallback helpers when Bootstrap JS is not available
            function showModalFallback(el) {
                // Create backdrop if not exists
                let backdrop = document.getElementById('gt-modal-backdrop');
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.id = 'gt-modal-backdrop';
                    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1040;';
                    document.body.appendChild(backdrop);
                    backdrop.addEventListener('click', () => hideModalFallback(el));
                } else {
                    backdrop.style.display = 'block';
                }
                // Ensure modal is visible and centered
                el.style.display = 'block';
                el.classList.add('show');
                el.style.zIndex = '1050';
                el.style.position = 'fixed';
                el.style.inset = '0';
                el.style.overflow = 'auto';
                document.body.style.overflow = 'hidden';
                // Close buttons (data-bs-dismiss)
                el.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
                    btn.addEventListener('click', () => hideModalFallback(el), { once: true });
                });
                // ESC key to close
                const escHandler = function(e){ if (e.key === 'Escape') hideModalFallback(el); };
                document.addEventListener('keydown', escHandler, { once: true });
                el.__gtEscHandler = escHandler;
            }

            function hideModalFallback(el) {
                el.style.display = 'none';
                el.classList.remove('show');
                const backdrop = document.getElementById('gt-modal-backdrop');
                if (backdrop) backdrop.style.display = 'none';
                document.body.style.overflow = '';
                if (el.__gtEscHandler) {
                    document.removeEventListener('keydown', el.__gtEscHandler);
                    delete el.__gtEscHandler;
                }
            }

            function showChangePasswordModal() {
                if (!modalEl) return;
                // Put username into modal header if present
                const modalUsername = document.getElementById('modal-username');
                if (modalUsername && username) modalUsername.textContent = username;
                // Ensure modal is not clipped by parent containers
                try {
                    if (modalEl.parentElement !== document.body) {
                        document.body.appendChild(modalEl);
                    }
                } catch(_) {}
                modalEl.setAttribute('aria-hidden', 'false');
                modalEl.setAttribute('role', 'dialog');
                // Close dropdown first for cleanliness
                if (dropdown) dropdown.style.display = 'none';
                try {
                    if (window.bootstrap && window.bootstrap.Modal) {
                        const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                        modal.show();
                    } else {
                        showModalFallback(modalEl);
                    }
                } catch (err) {
                    console.error('Modal open error:', err);
                    showModalFallback(modalEl);
                }
            }

            if (changePasswordBtn && modalEl) {
                changePasswordBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    showChangePasswordModal();
                    if (newPasswordInput) newPasswordInput.focus();
                });
            }
            if (editProfileBtn) {
                // Keep active state behavior minimal; profile data is already visible by default
                editProfileBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (profileInfoSection) profileInfoSection.style.display = 'block';
                });
            }
            
            // Password validation functions
            function validatePassword(password) {
                if (!password) return false;
                const hasMinLength = password.length >= 8;
                const hasUppercase = /[A-Z]/.test(password);
                const hasNumber = /\d/.test(password);
                
                // Update requirement indicators
                const reqLength = document.getElementById('req-length');
                const reqUppercase = document.getElementById('req-uppercase');
                const reqNumber = document.getElementById('req-number');
                
                if (reqLength) reqLength.className = hasMinLength ? 'text-success' : 'text-danger';
                if (reqUppercase) reqUppercase.className = hasUppercase ? 'text-success' : 'text-danger';
                if (reqNumber) reqNumber.className = hasNumber ? 'text-success' : 'text-danger';
                
                return hasMinLength && hasUppercase && hasNumber;
            }
            
            function validatePasswordMatch() {
                if (!newPasswordInput) return false;
                const password = newPasswordInput.value;
                if (!confirmPasswordInput) return true; // modal may not have confirm
                const confirmPassword = confirmPasswordInput.value;
                const match = password === confirmPassword;
                const matchElement = document.getElementById('password-match');
                if (matchElement) {
                    matchElement.style.display = (password && confirmPassword && !match) ? 'block' : 'none';
                }
                return match;
            }
            
            function resetPasswordValidation() {
                const matchElement = document.getElementById('password-match');
                if (matchElement) matchElement.style.display = 'none';
                
                const requirements = document.querySelectorAll('#password-requirements div');
                requirements.forEach(el => {
                    if (el) el.className = 'text-danger';
                });
                
                if (savePasswordBtn) savePasswordBtn.disabled = true;
            }
            
            // Real-time password validation (modal fields)
            if (newPasswordInput) {
                newPasswordInput.addEventListener('input', function() {
                    updateStrengthUI(this.value);
                    validatePassword(this.value);
                    validatePasswordMatch();
                    updateSaveButtonState();
                });
            }
            if (confirmPasswordInput) {
                confirmPasswordInput.addEventListener('input', function() {
                    validatePasswordMatch();
                    updateSaveButtonState();
                });
            }
            if (currentPasswordInput) {
                currentPasswordInput.addEventListener('input', updateSaveButtonState);
            }
            
            function updateSaveButtonState() {
                if (!savePasswordBtn || !newPasswordInput) return;
                const currentPasswordValid = currentPasswordInput ? currentPasswordInput.value.length > 0 : true;
                const newPasswordValid = validatePassword(newPasswordInput.value);
                const passwordsMatch = validatePasswordMatch();
                savePasswordBtn.disabled = !(currentPasswordValid && newPasswordValid && passwordsMatch);
            }

            // Update strength bar/text in modal if present
            function updateStrengthUI(value) {
                const bar = document.getElementById('password-strength-bar');
                const text = document.getElementById('password-strength-text');
                if (!bar || !text) return;
                let score = 0;
                if (value.length >= 8) score += 34;
                if (/[A-Z]/.test(value)) score += 33;
                if (/\d/.test(value)) score += 33;
                bar.style.width = Math.min(score, 100) + '%';
                if (score < 34) { bar.className = 'progress-bar bg-danger'; text.textContent = 'Şifrə gücü: zəif'; }
                else if (score < 67) { bar.className = 'progress-bar bg-warning'; text.textContent = 'Şifrə gücü: orta'; }
                else { bar.className = 'progress-bar bg-success'; text.textContent = 'Şifrə gücü: güclü'; }
            }
            
            // Handle password save click in modal
            if (savePasswordBtn) {
                savePasswordBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    if (!newPasswordInput) return;
                    const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
                    const newPassword = newPasswordInput.value;
                    if (confirmPasswordInput && newPassword !== confirmPasswordInput.value) {
                        toast.error('Yeni şifrələr uyğun gəlmir');
                        return;
                    }
                    try {
                        console.log('Password change requested', { currentPassword, newPassword });
                        toast.success('Şifrə uğurla dəyişdirildi');
                        if (newPasswordInput) newPasswordInput.value = '';
                        if (confirmPasswordInput) confirmPasswordInput.value = '';
                        updateStrengthUI('');
                        updateSaveButtonState();
                        // Close modal
                        if (modalEl) {
                            if (window.bootstrap && window.bootstrap.Modal) {
                                const instance = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                                instance.hide();
                            } else {
                                hideModalFallback(modalEl);
                            }
                        }
                    } catch (error) {
                        console.error('Password change error:', error);
                        toast.error('Xəta: ' + (error.message || 'Şifrə dəyişdirilərkən xəta baş verdi'));
                    }
                });
            }
            
            // Cancel password change
            if (cancelPasswordChange) {
                cancelPasswordChange.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (passwordForm) passwordForm.reset();
                    resetPasswordValidation();
                    if (profileInfoSection) profileInfoSection.style.display = 'block';
                    if (passwordChangeSection) passwordChangeSection.style.display = 'none';
                });
            }
        }
    */
    }
    
    // Initialize when page loads
    function initializeAdmin() {
        try {
            // Initialize API client with base URL
            window.apiClient = new ApiClient(API_BASE_URL);
            
            // Check authentication status and proceed
            return Promise.resolve(checkAuth()).then(isAuthenticated => {
                // Only initialize the rest if we're authenticated
                if (isAuthenticated) {
                    // Initialize user avatar (without dropdown)
                    initUserAvatar();
                    
                    // Initialize tabs and other UI components
                    initTabs();
                    
                    // Initialize create user form if on users tab
                    const urlParams = new URLSearchParams(window.location.search);
                    const tabParam = urlParams.get('tab');
                    
                    if (tabParam === 'users') {
                        initCreateUser();
                        loadUsers();
                    }
                    
                    // Remove any profile-related elements
                    const profileElements = [
                        document.getElementById('profile-info-section'),
                        document.querySelector('.user-profile'),
                        document.querySelector('.profile-dropdown')
                    ];
                    
                    profileElements.forEach(el => {
                        if (el && el.parentNode) {
                            el.parentNode.removeChild(el);
                        }
                    });
                }
            }).catch(error => {
                console.error('Error initializing admin panel:', error);
                window.toast.error('Admin paneli başlatmaq mümkün olmadı. Zəhmət olmasa səhifəni yeniləyin.');
            });
        } catch (error) {
            console.error('Error initializing admin panel:', error);
            window.toast.error('Admin paneli başlatmaq mümkün olmadı. Zəhmət olmasa səhifəni yeniləyin.');
            return Promise.reject(error);
        }
    }

    // Initialize immediately and also on DOMContentLoaded to ensure everything loads
    console.log('Admin script loaded, starting initialization...');
    
    function startInitialization() {
        console.log('Starting admin panel initialization...');
        initializeAdmin().catch(error => {
            console.error('Error during initialization:', error);
            // Try again after a short delay if there's an error
            setTimeout(initializeAdmin, 1000);
        });
    }
    
    if (document.readyState === 'loading') {
        console.log('Waiting for DOM to load...');
        document.addEventListener('DOMContentLoaded', startInitialization);
    } else {
        console.log('DOM already loaded, starting immediately');
        startInitialization();
    }

    // Logout functionality (handled in initializeAdmin, but keep this as a fallback)
    const logoutBtn = document.querySelector('#logout, #logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                // Try to call the logout API if we have a token
                const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
                if (token) {
                    try {
                        // Use the apiClient if available
                        if (window.apiClient) {
                            await window.apiClient.post('auth/logout');
                        } else {
                            // Fallback to direct fetch
                            await fetch(`${API_BASE_URL}/api/auth/logout`, {
                                method: 'POST',
                                headers: { 
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                credentials: 'omit',
                                mode: 'cors'
                            });
                        }
                    } catch (apiError) {
                        console.warn('Logout API call failed, but continuing with client-side cleanup', apiError);
                    }
                }
            } finally {
                // Clear all auth data
                localStorage.removeItem('auth_token');
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('auth_role');
                sessionStorage.clear();
                
                // Redirect to login page
                window.location.href = 'login.html';
                
                // Add a small delay to ensure the redirect happens
            }
        });
    }
})();
