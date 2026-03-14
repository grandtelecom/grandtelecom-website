/**
 * Təhlükəsizlik konfiqurasiya faylı (bərpa olunmuş)
 * Bütün API əlaqələri və təhlükəsizlik parametrləri üçün mərkəzi konfiqurasiya
 */
(function () {
  // Mühit təyini: localhost, 127.0.0.1, ::1 və Live Server portları lokal sayılır
  const HOST = window.location.hostname;
  const PORT = window.location.port;
  const IS_LOCAL = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(HOST) || ['5500','5501','8080'].includes(PORT);

  // BASE_URL üçün override mexanizmi (ən yüksək prioritetdən aşağıya)
  const OVERRIDE_BASE = (function() {
    try {
      if (typeof window !== 'undefined') {
        if (window.FORCE_API_BASE_URL && typeof window.FORCE_API_BASE_URL === 'string') {
          return window.FORCE_API_BASE_URL;
        }
        const ls = window.localStorage ? window.localStorage.getItem('API_BASE_URL_OVERRIDE') : null;
        if (ls) return ls;
        if (window.CONFIG && window.CONFIG.API_BASE_URL) return window.CONFIG.API_BASE_URL;
      }
    } catch (_) { /* ignore */ }
    return null;
  })();
  // Əsas konfiqurasiya obyekti
  const CONFIG = {
    // Ümumi icazə verilən bölmələr (frontend doğrulama üçün)
    ALLOWED_SECTIONS: ['about', 'contact', 'campaigns', 'home', 'news', 'gallery'],
    // Fayl ölçüsü limiti (5MB) — frontend doğrulama üçün
    MAX_FILE_SIZE: 5 * 1024 * 1024,

    // Tətbiq parametrləri
    APP: {
      NAME: 'Grand Telecom Admin',
      VERSION: '1.0.0',
      ENV: IS_LOCAL ? 'development' : 'production',
      DEBUG: IS_LOCAL,
      DEFAULT_LANGUAGE: 'az',
      SUPPORTED_LANGUAGES: ['az', 'en', 'ru']
    },

    // Backend API konfiqurasiyası
    API: {
      BASE_URL: OVERRIDE_BASE || (IS_LOCAL
        ? 'http://localhost:3001/api'
        : 'https://api.grandtelecom.az'),
      TIMEOUT_MS: 10000, // 10 saniyə
      VERSION: 'v1',

      // Təhlükəsizlik başlıqları
      HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-API-Key': 'gt_' + btoa('grand_telecom_' + window.location.hostname)
      },

      // CSRF token üçün konfiqurasiya
      CSRF: {
        COOKIE_NAME: 'XSRF-TOKEN',
        HEADER_NAME: 'X-XSRF-TOKEN',
        TOKEN: null
      },

      // JWT token üçün konfiqurasiya
      AUTH: {
        TOKEN_KEY: 'auth_token',
        REFRESH_TOKEN_KEY: 'refresh_token',
        TOKEN_EXPIRY: 3600, // 1 saat (saniyə ilə)
        REFRESH_TOKEN_EXPIRY: 2592000, // 30 gün (saniyə ilə)
        STORAGE_KEY: 'auth_data'
      },

      // Rate limiting konfiqurasiyası
      RATE_LIMIT: {
        ENABLED: true,
        MAX_REQUESTS: 100, // Maksimum sorğu sayı
        PER_MINUTES: 15,   // Dəqiqədə
        RETRY_AFTER: 60    // Saniyə ilə gözləmə müddəti
      },

      // İstifadəçi əməliyyatları üçün endpointlər
      ENDPOINTS: {
        // İstifadəçi əməliyyatları
        AUTH: {
          LOGIN: '/auth/login',
          LOGOUT: '/auth/logout',
          REFRESH: '/auth/refresh',
          FORGOT_PASSWORD: '/auth/forgot-password',
          RESET_PASSWORD: '/auth/reset-password',
          VERIFY_EMAIL: '/auth/verify-email',
          ME: '/auth/me'
        },

        // İstifadəçi idarəetmə
        USERS: {
          BASE: '/users',
          BY_ID: function (id) { return `/users/${id}`; },
          CHANGE_PASSWORD: function (id) { return `/users/${id}/change-password`; },
          TOGGLE_ACTIVE: function (id) { return `/users/${id}/toggle-active`; },
          ROLES: '/users/roles',
          PERMISSIONS: '/users/permissions',
          PROFILE: '/users/profile',
          AVATAR: function (id) { return `/users/${id}/avatar`; }
        },

        // Məzmun idarəetmə
        CONTENT: {
          BASE: '/content',
          BY_SECTION: function (section) { return `/content/${section}`; },
          BY_ID: function (id) { return `/content/id/${id}`; }
        },

        // Fayl yükləmə
        UPLOAD: {
          BASE: '/upload',
          IMAGE: '/upload/image',
          DOCUMENT: '/upload/document',
          DELETE: function (filename) { return `/upload/${filename}`; }
        },

        // Digər API endpointləri
        SETTINGS: '/settings',
        LOGS: '/logs',
        BACKUP: '/backup',
        STATS: '/stats',

        // Xüsusi sorğu parametrləri üçün URL generator
        buildUrl: function (endpoint, params) {
          params = params || {};
          let url = endpoint;
          const queryParams = [];

          Object.entries(params).forEach(function ([key, value]) {
            if (value !== undefined && value !== null) {
              queryParams.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
            }
          });

          if (queryParams.length > 0) {
            url += (url.includes('?') ? '&' : '?') + queryParams.join('&');
          }

          return url;
        }
      }
    },

    // Təhlükəsizlik
    SECURITY: {
      // CORS konfiqurasiyası
      CORS: {
        ALLOWED_ORIGINS: [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://grandtelecom.az',
          'https://www.grandtelecom.az'
        ],
        ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        ALLOW_CREDENTIALS: true
      },
      // Şifrə təhlükəsizliyi
      PASSWORD: {
        MIN_LENGTH: 8,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBERS: true,
        REQUIRE_SYMBOLS: true,
        MAX_ATTEMPTS: 5,
        LOCKOUT_TIME: 15, // dəqiqə
        HISTORY_SIZE: 5, // Son 5 şifrəni yadda saxla
        EXPIRE_DAYS: 90 // 90 gündən sonra şifrə dəyişmək tələb olunur
      },
      SESSION: {
        TIMEOUT: 30, // dəqiqə
        WARNING_BEFORE_TIMEOUT: 5 // dəqiqə
      }
    },

    // Doğrulama qaydaları
    VALIDATION_RULES: {
      USERNAME: /^[a-zA-Z0-9_]{4,30}$/,
      PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      // Testlər üçün uyğun alias
      EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      PHONE: /^[0-9+\-\s()]{10,20}$/,
      NAME: /^[a-zA-ZəöğıçşüƏÖĞIÇŞÜ\s\-]{2,50}$/,
      // Uzunluq limitləri (frontend doğrulama üçün)
      MAX_TITLE_LENGTH: 200,
      MAX_CONTENT_LENGTH: 5000,
      MESSAGES: {
        REQUIRED: 'Bu sahə mütləq doldurulmalıdır',
        INVALID_EMAIL: 'Düzgün e-poçt ünvanı daxil edin',
        INVALID_PHONE: 'Düzgün telefon nömrəsi daxil edin',
        PASSWORD_TOO_WEAK: 'Şifrə ən azı 8 simvoldan ibarət olmalı, böyük hərf, kiçik hərf, rəqəm və xüsusi simvol ehtiva etməlidir',
        PASSWORD_MISMATCH: 'Şifrələr üst-üstə düşmür',
        MIN_LENGTH: function (min) { return 'Ən azı ' + min + ' simvol daxil edin'; },
        MAX_LENGTH: function (max) { return 'Ən çox ' + max + ' simvol daxil edə bilərsiniz'; },
        BETWEEN_LENGTH: function (min, max) { return min + ' ilə ' + max + ' simvol arasında mətn daxil edin'; }
      }
    },

    // Xəta kodları
    ERROR_CODES: {
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      VALIDATION_ERROR: 422,
      TOO_MANY_REQUESTS: 429,
      SERVER_ERROR: 500
    },

    // Xəta mesajları
    ERROR_MESSAGES: {
      // Ümumi xəta mesajları
      GENERAL: {
        SERVER_ERROR: 'Server xətası baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.',
        NETWORK_ERROR: 'Şəbəkə xətası baş verdi. İnternet bağlantınızı yoxlayın.',
        UNAUTHORIZED: 'Giriş etməlisiniz',
        FORBIDDEN: 'Bu əməliyyatı yerinə yetirmək üçün icazəniz yoxdur',
        NOT_FOUND: 'Məlumat tapılmadı',
        VALIDATION_ERROR: 'Daxil edilmiş məlumatlar doğru deyil',
        TOO_MANY_REQUESTS: 'Çox sayda sorğu göndərdiniz. Zəhmət olmasa bir az gözləyin.'
      },
      // İstifadəçi ilə bağlı xəta mesajları
      USER: {
        NOT_FOUND: 'İstifadəçi tapılmadı',
        EMAIL_EXISTS: 'Bu e-poçt ünvanı ilə qeydiyyatdan keçilib',
        USERNAME_EXISTS: 'Bu istifadəçi adı artıq istifadə olunur',
        INVALID_CREDENTIALS: 'Yanlış e-poçt və ya şifrə',
        ACCOUNT_LOCKED: 'Hesabınız müvəqqəti olaraq bağlanıb. Zəhmət olmasa 15 dəqiqə sonra yenidən cəhd edin.',
        PASSWORD_EXPIRED: 'Şifrənizin müddəti bitib. Zəhmət olmasa yeni şifrə təyin edin.',
        TOKEN_EXPIRED: 'Sessiyanızın müddəti bitib. Zəhmət olmasa yenidən daxil olun.'
      },
      // Fayl yükləmə xəta mesajları
      UPLOAD: {
        FILE_TOO_LARGE: 'Fayl ölçüsü çox böyükdür',
        INVALID_TYPE: 'Bu tip faylları yükləmək olmaz',
        UPLOAD_FAILED: 'Fayl yüklənərkən xəta baş verdi',
        MAX_FILES_EXCEEDED: 'Maksimum fayl sayını keçdiniz'
      }
    },

    // Uğur mesajları
    SUCCESS_MESSAGES: {
      // İstifadəçi əməliyyatları
      USER: {
        LOGIN_SUCCESS: 'Uğurla daxil oldunuz',
        LOGOUT_SUCCESS: 'Uğurla çıxış etdiniz',
        PROFILE_UPDATED: 'Profil məlumatlarınız yeniləndi',
        PASSWORD_CHANGED: 'Şifrəniz uğurla dəyişdirildi',
        ACCOUNT_CREATED: 'Hesabınız uğurla yaradıldı',
        PASSWORD_RESET_SENT: 'Şifrə sıfırlama linki e-poçt ünvanınıza göndərildi',
        PASSWORD_RESET_SUCCESS: 'Şifrəniz uğurla sıfırlandı',
        EMAIL_VERIFIED: 'E-poçt ünvanınız uğurla təsdiqləndi'
      },
      // Məzmun əməliyyatları
      CONTENT: {
        SAVED: 'Məzmun uğurla yadda saxlanıldı',
        UPDATED: 'Məzmun uğurla yeniləndi',
        DELETED: 'Məzmun uğurla silindi',
        PUBLISHED: 'Məzmun uğurla dərc edildi',
        UNPUBLISHED: 'Məzmun nəşrdən qaldırıldı'
      },
      // Fayl əməliyyatları
      UPLOAD: {
        SUCCESS: 'Fayl uğurla yükləndi',
        DELETED: 'Fayl uğurla silindi'
      }
    },

    // Tarix formatları
    DATE_FORMATS: {
      SHORT: 'DD.MM.YYYY',
      MEDIUM: 'DD MMMM YYYY',
      LONG: 'dddd, D MMMM YYYY',
      TIME: 'HH:mm',
      DATETIME: 'DD.MM.YYYY HH:mm',
      ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
    },

    // Digər konfiqurasiyalar
    OTHER: {
      // Pagination
      PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_PAGE_SIZE: 10,
        PAGE_SIZES: [10, 25, 50, 100],
        MAX_PAGE_SIZE: 100
      },
      // Bildirişlər
      NOTIFICATIONS: {
        DEFAULT_DURATION: 5000, // 5 saniyə
        MAX_VISIBLE: 5
      },
      // Digər parametrlər
      MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
      ALLOWED_FILE_TYPES: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    }
  };

  // Global dəyişənlərə əlavə et
  window.APP_CONFIG = CONFIG;
  window.CONFIG = window.CONFIG || CONFIG;

  // Geri uyğunluq: flat struktur gözləyən kodlar üçün alias
  // Məs: login.html və ya apiClient.new.js daxilində `CONFIG.API_BASE_URL` istifadə olunursa
  CONFIG.API_BASE_URL = CONFIG.API.BASE_URL;
  // Pəncərə səviyyəsində də təmin edək
  if (window.CONFIG) {
    window.CONFIG.API_BASE_URL = (window.CONFIG.API && window.CONFIG.API.BASE_URL) || CONFIG.API.BASE_URL;
  }

  // Əgər development mühitindədiriksə, konfiqurasiyanı konsola çıxar
  if (CONFIG.APP.DEBUG) {
    console.log('Konfiqurasiya yükləndi:', CONFIG);
  }

  // Node.js üçün export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
  }
})();
