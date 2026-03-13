// Image processing utilities
class ImageUtils {
    static compressImage(file, maxWidth = CONFIG.MAX_IMAGE_WIDTH, quality = CONFIG.IMAGE_QUALITY) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                // Calculate new dimensions
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Image compression failed'));
                    }
                }, 'image/jpeg', quality);
            };
            
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = URL.createObjectURL(file);
        });
    }

    static async processImageUpload(file, previewElement, alertCallback) {
        try {
            // Validate file
            const validationErrors = ValidationUtils.validateImageFile(file);
            if (validationErrors.length > 0) {
                alertCallback(validationErrors.join(', '), 'error');
                return null;
            }
            
            // Compress image
            const compressedFile = await this.compressImage(file);
            
            // Create preview
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onload = function(e) {
                    previewElement.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                    alertCallback('Şəkil sıxışdırıldı və yükləndi', 'success');
                    resolve(e.target.result);
                };
                reader.readAsDataURL(compressedFile);
            });
        } catch (error) {
            console.error('Image processing error:', error);
            alertCallback('Şəkil emalında xəta', 'error');
            return null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageUtils;
} else {
    window.ImageUtils = ImageUtils;
}
