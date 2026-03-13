// Profile management functionality for admin panel
import ApiClient from './apiClient.js';

// Make sure we don't initialize twice
if (window.profileInitialized) {
  console.warn('profile.js already initialized');
} else {
  window.profileInitialized = true;
  
  // Initialize API client with proper base URL (guard missing CONFIG)
  const __BASE = (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.API_BASE_URL)
    ? CONFIG.API_BASE_URL
    : ((typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://127.0.0.1:3001');
  const api = new ApiClient(__BASE.replace(/\/api$/, '') + '/api');

  // Get authentication token from localStorage
  function getToken() {
    try {
      return (window.auth && typeof window.auth.getToken === 'function' ? window.auth.getToken() : '')
        || localStorage.getItem('auth_token')
        || localStorage.getItem('authToken')
        || '';
    } catch(_) { return ''; }
  }

  // Load and display user profile data
  async function loadUserProfile() {
    try {
      // ApiClient already injects Authorization header from storage; do not pass headers as params
      const userData = await api.get('/auth/me');

      // Sanitize user data to prevent prototype pollution
      const sanitizedData = {
        username: userData.username || '',
        role: userData.role || 'user',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
        lastLogin: userData.lastLogin || null,
        avatar: null // Don't use avatar from API for security
      };

      // Update profile in dropdown
      updateProfileElements(sanitizedData);
      
      // Update profile in profile tab
      updateProfileTab(sanitizedData);
      
      return sanitizedData;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      showError('Profil məlumatları yüklənərkən xəta baş verdi');
      return null;
    }
  }

  // Update profile elements in the dropdown
  function updateProfileElements(userData) {
    if (!userData) return;
    
    // Update avatar - use default avatar for all users
    const avatar = document.getElementById('user-avatar');
    const dropdownAvatar = document.getElementById('dropdown-avatar');
    
    // Always use default avatar for security
    const defaultAvatarBg = '#4e73df';
    const name = [userData.firstName, userData.lastName].filter(Boolean).join(' ');
    const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'US';
    
    // Set avatar with initials
    if (avatar) {
      avatar.textContent = initials;
      avatar.style.backgroundColor = defaultAvatarBg;
      avatar.style.backgroundImage = 'none';
    }
    
    if (dropdownAvatar) {
      dropdownAvatar.textContent = initials;
      dropdownAvatar.style.backgroundColor = defaultAvatarBg;
      dropdownAvatar.style.backgroundImage = 'none';
    }

    // Update username and role
    const usernameElement = document.getElementById('dropdown-username');
    const roleElement = document.getElementById('dropdown-role');
    
    // Sanitize username to prevent XSS
    const safeUsername = String(userData.username || '').substring(0, 50);
    if (usernameElement) usernameElement.textContent = safeUsername;
    
    // Set role display text
    if (roleElement) {
      const role = String(userData.role || 'user').toLowerCase();
      const roleText = {
        'superadmin': 'Super Admin',
        'admin': 'Admin',
        'user': 'İstifadəçi'
      }[role] || 'İstifadəçi';
      
      roleElement.textContent = roleText;
    }

    // Update profile info in dropdown
    const fullnameElement = document.getElementById('profile-fullname');
    const phoneElement = document.getElementById('profile-phone');
    const lastLoginElement = document.getElementById('last-login');
    
    // Update dropdown profile info
    const dropdownName = document.getElementById('dropdown-profile-name');
    const dropdownPhone = document.getElementById('dropdown-profile-phone');
    const dropdownLastLogin = document.getElementById('dropdown-last-login');
    
    // Set name - use first name + last name or fallback to username
    const fullName = [userData.firstName, userData.lastName].filter(Boolean).join(' ');
    const displayName = fullName || userData.username || 'Təyin edilməyib';
    if (fullnameElement) fullnameElement.textContent = displayName.substring(0, 50);
    if (dropdownName) dropdownName.textContent = displayName.substring(0, 50);
    
    // Set phone - sanitize and format
    const phone = String(userData.phoneNumber || '').replace(/[^0-9+]/g, '');
    let displayPhone = 'Təyin edilməyib';
    
    if (phone) {
      // Format phone number if it's in the expected format
      if (phone.startsWith('994') && phone.length >= 12) {
        displayPhone = `+${phone.substring(0, 3)} ${phone.substring(3, 5)} ${phone.substring(5, 8)} ${phone.substring(8, 10)} ${phone.substring(10)}`;
      } else if (phone.length >= 7) {
        displayPhone = phone;
      }
    }
    
    if (phoneElement) phoneElement.textContent = displayPhone;
    if (dropdownPhone) dropdownPhone.textContent = displayPhone;
    
    // Set last login
    let lastLoginHtml = '<i class="far fa-clock me-1"></i> Məlumat yoxdur';
    if (userData.last_login) {
      const lastLogin = new Date(userData.last_login);
      lastLoginHtml = `<i class="far fa-clock me-1"></i> ${formatDate(lastLogin)}`;
    }
    
    if (lastLoginElement) lastLoginElement.innerHTML = lastLoginHtml;
    if (dropdownLastLogin) dropdownLastLogin.innerHTML = lastLoginHtml;
  }

  // Update profile tab with user data
  function updateProfileTab(userData) {
    const fullnameTab = document.getElementById('profile-fullname-tab');
    const phoneTab = document.getElementById('profile-phone-tab');
    const lastLoginTab = document.getElementById('last-login-tab');
    
    if (fullnameTab) fullnameTab.innerHTML = userData.name ? `<span>${userData.name}</span>` : '<span class="text-muted">Təyin edilməyib</span>';
    if (phoneTab) phoneTab.innerHTML = userData.phone ? `<a href="tel:${userData.phone}">${userData.phone}</a>` : '<span class="text-muted">Təyin edilməyib</span>';
    
    if (lastLoginTab) {
      if (userData.last_login) {
        const lastLogin = new Date(userData.last_login);
        lastLoginTab.innerHTML = `<i class="far fa-clock me-1"></i> ${formatDate(lastLogin)}`;
      } else {
        lastLoginTab.innerHTML = '<i class="far fa-clock me-1"></i> Məlumat yoxdur';
      }
    }
  }

  // Format date to readable string
  function formatDate(date) {
    if (!(date instanceof Date)) return '';
    
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString('az-AZ', options);
  }

  // Show error message
  function showError(message) {
    console.error(message);
    // You can implement a toast or alert here if needed
  }

  // Toggle profile info section
  function toggleProfileInfo(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const profileInfo = document.getElementById('profile-info-section');
    const profileArrow = document.getElementById('profile-arrow');
    
    if (!profileInfo || !profileArrow) return;
    
    // Toggle visibility using a class instead of inline styles
    const isVisible = profileInfo.classList.contains('show');
    
    if (isVisible) {
      profileInfo.classList.remove('show');
      profileArrow.style.transform = 'rotate(0deg)';
    } else {
      profileInfo.classList.add('show');
      profileArrow.style.transform = 'rotate(180deg)';
    }
  }

  // Initialize profile functionality
  function initProfile() {
    // Load profile data when page loads
    loadUserProfile();
    
    // Get profile elements
    const profileBtn = document.getElementById('edit-profile-btn');
    const profileInfo = document.getElementById('profile-info-section');
    const profileArrow = document.getElementById('profile-arrow');
    
    if (!profileBtn || !profileInfo || !profileArrow) return;
    
    // Add CSS for the show/hide functionality
    const style = document.createElement('style');
    style.textContent = `
      #profile-info-section {
        display: none;
      }
      #profile-info-section.show {
        display: block;
      }
    `;
    document.head.appendChild(style);
    
    // Set initial state
    profileInfo.classList.remove('show');
    profileArrow.style.transform = 'rotate(0deg)';
    
    // Add click event listener to the button
    profileBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleProfileInfo(e);
    };
    
    // Close when clicking outside
    document.onclick = function(e) {
      if (!profileInfo.contains(e.target) && 
          !profileBtn.contains(e.target) && 
          profileInfo.classList.contains('show')) {
        toggleProfileInfo(e);
      }
    };
    
    // Set up event listeners for profile tab buttons
    const editProfileBtn = document.getElementById('edit-profile-btn-tab');
    const changePasswordBtn = document.getElementById('change-password-btn-tab');
    
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => {
        // Show edit profile modal or form
        console.log('Edit profile clicked');
        // Implement edit profile functionality here
      });
    }
    
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', () => {
        // Show change password modal
        const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        changePasswordModal.show();
      });
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all elements are loaded
    setTimeout(initProfile, 100);
  });
  
  // Also try to initialize immediately if DOM is already loaded
  if (document.readyState !== 'loading') {
    setTimeout(initProfile, 100);
  }
}
