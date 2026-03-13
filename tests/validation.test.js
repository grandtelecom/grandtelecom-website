// Unit tests for validation utilities
describe('ValidationUtils', () => {
    describe('sanitizeInput', () => {
        test('should sanitize HTML characters', () => {
            const input = '<script>alert("xss")</script>';
            const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
            expect(ValidationUtils.sanitizeInput(input)).toBe(expected);
        });

        test('should handle non-string input', () => {
            expect(ValidationUtils.sanitizeInput(null)).toBe('');
            expect(ValidationUtils.sanitizeInput(undefined)).toBe('');
            expect(ValidationUtils.sanitizeInput(123)).toBe('');
        });

        test('should trim whitespace', () => {
            expect(ValidationUtils.sanitizeInput('  test  ')).toBe('test');
        });
    });

    describe('validateSection', () => {
        test('should validate allowed sections', () => {
            expect(ValidationUtils.validateSection('about')).toBe(true);
            expect(ValidationUtils.validateSection('contact')).toBe(true);
            expect(ValidationUtils.validateSection('invalid')).toBe(false);
        });
    });

    describe('validateFormData', () => {
        test('should validate title length', () => {
            const data = { title: 'a'.repeat(201) };
            const errors = ValidationUtils.validateFormData(data);
            expect(errors).toContain('Başlıq çox uzundur (max 200 simvol)');
        });

        test('should validate email format', () => {
            const data = { email: 'invalid-email' };
            const errors = ValidationUtils.validateFormData(data);
            expect(errors).toContain('Email formatı düzgün deyil');
        });

        test('should pass valid data', () => {
            const data = {
                title: 'Valid title',
                email: 'test@example.com',
                phone: '+994123456789'
            };
            const errors = ValidationUtils.validateFormData(data);
            expect(errors).toHaveLength(0);
        });
    });
});

describe('ImageUtils', () => {
    describe('validateImageFile', () => {
        test('should validate image file type', () => {
            const file = new File([''], 'test.txt', { type: 'text/plain' });
            const errors = ValidationUtils.validateImageFile(file);
            expect(errors).toContain('Yalnız şəkil faylları qəbul edilir');
        });

        test('should validate file size', () => {
            const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
            const errors = ValidationUtils.validateImageFile(largeFile);
            expect(errors).toContain('Şəkil ölçüsü 5MB-dan böyük ola bilməz');
        });
    });
});
