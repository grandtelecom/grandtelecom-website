// Input validation and sanitization utilities
class ValidationUtils {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        // Escape HTML special characters and trim
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        };
        return input
            .trim()
            .replace(/[&<>"'\/]/g, (ch) => map[ch]);
    }

    static sanitizeHtmlContent(input) {
        if (typeof input !== 'string') return '';
        // Allow basic HTML tags for rich text content
        const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        // Remove script tags and other dangerous elements
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }

    static validateSection(section) {
        return CONFIG.ALLOWED_SECTIONS.includes(section);
    }

    static validatePhone(phone) {
        const errors = [];
        if (typeof phone !== 'string') {
            errors.push('Telefon nömrəsi 9 rəqəmdən ibarət olmalıdır');
            return errors;
        }
        const original = phone.trim();
        // Remove any non-digit characters for normalization
        const digitsOnly = original.replace(/\D/g, '');

        let nationalPart = '';
        // Support international format +994XXXXXXXXX (Azerbaijan) or local 9-digit format
        if (/^\+?994/.test(original)) {
            // Expect 12 digits total (994 + 9 digits)
            if (!digitsOnly.startsWith('994') || digitsOnly.length !== 12) {
                errors.push('Telefon nömrəsi 9 rəqəmdən ibarət olmalıdır');
                return errors;
            }
            nationalPart = digitsOnly.slice(3); // last 9 digits
        } else {
            // Local format must be exactly 9 digits
            if (digitsOnly.length !== 9) {
                errors.push('Telefon nömrəsi 9 rəqəmdən ibarət olmalıdır');
                return errors;
            }
            nationalPart = digitsOnly;
        }

        // Check if starts with 0
        if (nationalPart.startsWith('0')) {
            errors.push('Telefon nömrəsi 0 ilə başlaya bilməz');
            return errors;
        }
        
        // Check for forbidden patterns (evaluate on the 9-digit national part)
        const forbiddenPatterns = [
            '555555555', '111111111', '222222222', '333333333', '444444444',
            '666666666', '777777777', '888888888', '999999999', '987654321'
        ];
        
        if (forbiddenPatterns.includes(nationalPart)) {
            errors.push('Bu telefon nömrəsi qəbul edilmir');
            return errors;
        }
        
        // Check for all same digits
        const allSameDigit = /^(\d)\1{8}$/.test(nationalPart);
        if (allSameDigit) {
            errors.push('Telefon nömrəsi eyni rəqəmlərdən ibarət ola bilməz');
            return errors;
        }
        
        return errors;
    }

    static validateFormData(data) {
        const errors = [];
        
        if (data.title && data.title.length > CONFIG.VALIDATION_RULES.MAX_TITLE_LENGTH) {
            errors.push(`Başlıq çox uzundur (max ${CONFIG.VALIDATION_RULES.MAX_TITLE_LENGTH} simvol)`);
        }
        
        if (data.content && data.content.length > CONFIG.VALIDATION_RULES.MAX_CONTENT_LENGTH) {
            errors.push(`Məzmun çox uzundur (max ${CONFIG.VALIDATION_RULES.MAX_CONTENT_LENGTH} simvol)`);
        }
        
        if (data.email && !CONFIG.VALIDATION_RULES.EMAIL_REGEX.test(data.email)) {
            errors.push('Email formatı düzgün deyil');
        }
        
        if (data.phone) {
            const phoneErrors = this.validatePhone(data.phone);
            errors.push(...phoneErrors);
        }
        
        return errors;
    }

    static validateImageFile(file) {
        const errors = [];
        
        if (!file.type || !file.type.startsWith('image/')) {
            errors.push('Yalnız şəkil faylları qəbul edilir');
        }
        
        if (typeof file.size === 'number' && file.size > CONFIG.MAX_FILE_SIZE) {
            errors.push('Şəkil ölçüsü 5MB-dan böyük ola bilməz');
        }
        
        return errors;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationUtils;
} else {
    window.ValidationUtils = ValidationUtils;
}
