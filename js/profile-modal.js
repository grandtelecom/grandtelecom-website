// Profile Modal Functionality
function initProfileModal() {
    // Check if modal already exists
    if (document.getElementById('profile-modal')) {
        return;
    }

    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'profile-modal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.zIndex = '9999';
    modal.style.display = 'none';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    // Get user data
    const username = localStorage.getItem('username') || 'İstifadəçi';
    const isSuperadmin = ['superadmin', 'admin', 'timur'].includes(username.toLowerCase());
    
    // Modal content
    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                <h3 style="margin: 0;">Profil Məlumatları</h3>
                <button id="close-profile-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            
            <div style="display: flex; align-items: center; margin-bottom: 25px;">
                <div id="profile-avatar" style="width: 70px; height: 70px; border-radius: 50%; background: #1976D2; color: white; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; margin-right: 20px; flex-shrink: 0;">
                    ${isSuperadmin ? 'SA' : username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 style="margin: 0 0 5px 0; color: #333;">${isSuperadmin ? 'Super Admin' : username}</h3>
                    <div style="color: #666; margin-bottom: 5px;">${isSuperadmin ? 'Administrator' : 'İstifadəçi'}</div>
                    <div style="font-size: 13px; color: #888;">Son giriş: <span id="profile-last-login">${new Date().toLocaleString('az-AZ')}</span></div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px; background: #f9f9f9; padding: 15px; border-radius: 6px; border: 1px solid #eee;">
                <h4 style="margin-top: 0; margin-bottom: 15px; color: #444; border-bottom: 1px solid #eee; padding-bottom: 8px;">Hesab məlumatları</h4>
                
                <div style="display: flex; margin-bottom: 10px;">
                    <div style="width: 120px; color: #666;">İstifadəçi adı:</div>
                    <div style="flex: 1; font-weight: 500;">${username}</div>
                </div>
                
                <div style="display: flex; margin-bottom: 10px;">
                    <div style="width: 120px; color: #666;">Rolu:</div>
                    <div style="flex: 1; font-weight: 500;">${isSuperadmin ? 'Super Admin' : 'İstifadəçi'}</div>
                </div>
                
                <div style="display: flex;">
                    <div style="width: 120px; color: #666;">Status:</div>
                    <div style="flex: 1; font-weight: 500; color: #2E7D32;">
                        <i class="fas fa-circle" style="font-size: 10px; margin-right: 5px;"></i>
                        Aktiv
                    </div>
                </div>
            </div>
            
            <div>
                <h4 style="margin-top: 0; margin-bottom: 15px; color: #444; border-bottom: 1px solid #eee; padding-bottom: 8px;">Şifrəni dəyiş</h4>
                
                <form id="change-password-form">
                    <div style="margin-bottom: 15px;">
                        <label for="pm-current-password" style="display: block; margin-bottom: 6px; font-weight: 500; color: #555;">Cari şifrə</label>
                        <input type="password" id="pm-current-password" required 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;
                                      transition: border-color 0.3s;"
                               placeholder="Cari şifrənizi daxil edin">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="pm-new-password" style="display: block; margin-bottom: 6px; font-weight: 500; color: #555;">Yeni şifrə</label>
                        <input type="password" id="pm-new-password" required minlength="6"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
                               placeholder="Ən azı 6 simvol">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label for="pm-confirm-password" style="display: block; margin-bottom: 6px; font-weight: 500; color: #555;">Təkrar yeni şifrə</label>
                        <input type="password" id="pm-confirm-password" required
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
                               placeholder="Yeni şifrənizi təsdiq edin">
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end;">
                        <button type="button" id="cancel-password-change" 
                                style="padding: 8px 16px; margin-right: 10px; background: #f5f5f5; border: 1px solid #ddd; 
                                       border-radius: 4px; cursor: pointer; color: #555; font-weight: 500;">
                            Ləğv et
                        </button>
                        <button type="submit" 
                                style="padding: 8px 20px; background: #1976D2; color: white; border: none; 
                                       border-radius: 4px; cursor: pointer; font-weight: 500;">
                            Yadda saxla
                        </button>
                    </div>
                </form>
            </div>
            
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                <button id="logout-btn" style="background: none; border: none; color: #D32F2F; cursor: pointer; font-weight: 500; font-size: 14px;">
                    <i class="fas fa-sign-out-alt" style="margin-right: 5px;"></i>
                    Hesabdan çıxış
                </button>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close button
    const closeBtn = document.getElementById('close-profile-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancel-password-change');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('change-password-form').reset();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Clear auth data
            ['auth_token', 'authToken', 'username', 'auth_role', 'currentUser'].forEach(key => {
                localStorage.removeItem(key);
            });
            sessionStorage.clear();
            // Redirect to login page
            window.location.href = 'login.html';
        });
    }
    
    // Handle password change form submission
    const passwordForm = document.getElementById('change-password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('pm-current-password').value;
            const newPassword = document.getElementById('pm-new-password').value;
            const confirmPassword = document.getElementById('pm-confirm-password').value;
            
            // Validate form
            if (newPassword !== confirmPassword) {
                showAlert('Xəta', 'Yeni şifrələr eyni deyil!', 'error');
                return;
            }
            
            if (newPassword.length < 6) {
                showAlert('Xəta', 'Şifrə ən azı 6 simvol olmalıdır!', 'error');
                return;
            }
            
            try {
                // Show loading state
                const submitBtn = passwordForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İşlənir...';
                
                // Here you would make an API call to change the password
                // Example:
                // const response = await fetch('/api/change-password', {
                //     method: 'POST',
                //     headers: { 
                //         'Content-Type': 'application/json',
                //         'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || '')
                //     },
                //     body: JSON.stringify({ currentPassword, newPassword })
                // });
                // const result = await response.json();
                
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Show success message
                showAlert('Uğurlu', 'Şifrəniz uğurla dəyişdirildi!', 'success');
                
                // Reset form
                passwordForm.reset();
                
            } catch (error) {
                console.error('Şifrə dəyişdirilərkən xəta baş verdi:', error);
                showAlert('Xəta', 'Şifrə dəyişdirilərkən xəta baş verdi: ' + (error.message || ''), 'error');
            } finally {
                // Reset button state
                const submitBtn = passwordForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Yadda saxla';
                }
            }
        });
    }
    
    // Show alert function
    function showAlert(title, message, type = 'info') {
        // You can replace this with your preferred alert/notification system
        alert(`${title}: ${message}`);
    }
    
    // Close modal function
    function closeModal() {
        modal.style.display = 'none';
    }
    
    // Public methods
    return {
        show: function() {
            // Update last login time
            const lastLoginEl = document.getElementById('profile-last-login');
            if (lastLoginEl) {
                lastLoginEl.textContent = new Date().toLocaleString('az-AZ');
            }
            
            // Show the modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        },
        
        close: closeModal
    };
}

// Initialize profile modal when the script loads
const profileModal = initProfileModal();

// Make it available globally
window.profileModal = profileModal;
