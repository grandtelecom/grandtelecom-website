// Phone number validation for contact form
class PhoneValidator {
    static init() {
        const phoneInput = document.getElementById('contact-phone-input');
        const phoneError = document.getElementById('phone-error');
        
        if (!phoneInput) return;
        
        // Only allow numeric input
        phoneInput.addEventListener('input', function(e) {
            // Remove non-numeric characters
            let value = e.target.value.replace(/\D/g, '');
            
            // Limit to 9 digits
            if (value.length > 9) {
                value = value.substring(0, 9);
            }
            
            e.target.value = value;
            
            // Real-time validation
            PhoneValidator.validatePhone(value, phoneError);
        });
        
        // Prevent paste of invalid content
        phoneInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const cleanPaste = paste.replace(/\D/g, '').substring(0, 9);
            e.target.value = cleanPaste;
            PhoneValidator.validatePhone(cleanPaste, phoneError);
        });
        
        // Prevent non-numeric keypress
        phoneInput.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }
    
    static validatePhone(phone, errorElement) {
        if (!phone) {
            PhoneValidator.hideError(errorElement);
            return true;
        }
        
        // Check length
        if (phone.length !== 9) {
            PhoneValidator.showError(errorElement, 'Telefon nömrəsi 9 rəqəmdən ibarət olmalıdır');
            return false;
        }
        
        // Check if starts with 0
        if (phone.startsWith('0')) {
            PhoneValidator.showError(errorElement, 'Telefon nömrəsi 0 ilə başlaya bilməz');
            return false;
        }
        
        // Check forbidden patterns
        const forbiddenPatterns = [
            '555555555', '111111111', '222222222', '333333333', '444444444',
            '666666666', '777777777', '888888888', '999999999', '123456789', '987654321'
        ];
        
        if (forbiddenPatterns.includes(phone)) {
            PhoneValidator.showError(errorElement, 'Bu telefon nömrəsi qəbul edilmir');
            return false;
        }
        
        // Check for all same digits (additional safety)
        const allSameDigit = /^(\d)\1{8}$/.test(phone);
        if (allSameDigit) {
            PhoneValidator.showError(errorElement, 'Telefon nömrəsi eyni rəqəmlərdən ibarət ola bilməz');
            return false;
        }
        
        PhoneValidator.hideError(errorElement);
        return true;
    }
    
    static showError(errorElement, message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    static hideError(errorElement) {
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    PhoneValidator.init();
});

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PhoneValidator = PhoneValidator;
}
