// Admin users management functionality
import ApiClient from './apiClient.js';

// Make sure we don't initialize twice
if (window.adminUsersInitialized) {
  console.warn('admin-users.js already initialized');
} else {
  window.adminUsersInitialized = true;
  
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

  // Load users list
  async function loadUsers() {
    // Show loading state immediately
    const tbody = document.querySelector('#users-table tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Yüklənir...</span>
            </div>
          </td>
        </tr>`;
    }

    try {

      const currentUser = await api.get('/auth/me', undefined, {
        headers: { 'Authorization': 'Bearer ' + getToken() }
      });

      // Get all users
      let response = await api.get('/users', undefined, {
        headers: { 'Authorization': 'Bearer ' + getToken() }
      });
      
      // Add detailed logging of current user
      console.log('Current user details:', {
        username: currentUser.username,
        role: currentUser.role,
        roleType: typeof currentUser.role,
        roleTrimmed: currentUser.role ? currentUser.role.trim() : 'undefined',
        roleLower: currentUser.role ? currentUser.role.toLowerCase() : 'undefined'
      });
      
      // Ensure response is an array
      let users = Array.isArray(response) ? response : [];
      
      console.log('Users before filtering:', users);
      
      // Normalize the current user's role
      const currentUserRole = currentUser.role 
        ? currentUser.role.toString().trim().toLowerCase() 
        : '';
      
      // Always filter out superadmins for non-superadmin users (double security check)
      // Even though the backend should handle this, we add an extra layer of security
      users = users.filter(user => {
        if (!user) return false;
        
        // Normalize the user's role
        const userRole = user.role 
          ? user.role.toString().trim().toLowerCase() 
          : '';
          
        // If current user is not superadmin, filter out superadmins
        if (currentUserRole !== 'superadmin' && userRole === 'superadmin') {
          return false;
        }
        
        return true;
      });
      
      console.log('Users after filtering:', users);
      
      // If no users found after filtering
      if (users.length === 0) {
        const tbody = document.querySelector('#users-table tbody');
        if (tbody) {
          tbody.innerHTML = `
            <tr>
              <td colspan="8" class="text-center py-4">
                <i class="fas fa-info-circle me-2"></i>
                ${currentUser.role === 'superadmin' ? 'Heç bir istifadəçi tapılmadı.' : 'Göstəriləcək istifadəçi tapılmadı.'}
              </td>
            </tr>`;
        }
        return;
      }
      
      // Render users in the table
      renderUsers(users, currentUser);
      return;

      // Loading state is already shown at the beginning of the function

      // Users are already fetched and rendered above
      // This code is no longer needed
    } catch (error) {
      console.error('Failed to load users:', error);
      const tbody = document.querySelector('#users-table tbody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-4 text-danger">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Xəta baş verdi: ${error.message || 'Bilinməyən xəta'}
            </td>
          </tr>`;
      }
    }
  }

    // Render users in the table
  function renderUsers(users, currentUser) {
    const tbody = document.querySelector('#users-table tbody');
    
    if (!users || users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4">
            <i class="fas fa-info-circle me-2"></i>
            Heç bir istifadəçi tapılmadı.
          </td>
        </tr>
      `;
      return;
    }

    // Sort users by creation date (newest first)
    const sortedUsers = [...users].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Generate table rows
    tbody.innerHTML = sortedUsers.map(user => {
      const isCurrentUser = user.username === currentUser.username;
      const isSuperAdmin = user.role === 'superadmin';
      
      // Format creation date
      let createdAt = '-';  // Default value if createdAt is not available
      try {
        if (user.createdAt) {
          const date = new Date(user.createdAt);
          if (!isNaN(date.getTime())) {  // Check if date is valid
            createdAt = date.toLocaleDateString('az-AZ', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        }
      } catch (e) {
        console.error('Error formatting date:', e);
      }

      // Format phone number if exists
      let phoneNumber = user.phoneNumber || '-';
      if (phoneNumber && phoneNumber.length === 9) {
        phoneNumber = `+994 ${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3, 5)} ${phoneNumber.slice(5)}`;
      }

      return `
        <tr data-username="${user.username}" ${isCurrentUser ? 'class="table-active"' : ''}>
          <td>${user.id || '-'}</td>
          <td>${user.username}</td>
          <td>${user.firstName || ''} ${user.lastName || ''}</td>
          <td>${phoneNumber}</td>
          <td>${isSuperAdmin ? 'Super Admin' : 'Admin'}</td>
          <td>
            <span class="badge ${user.isActive ? 'bg-success' : 'bg-danger'}">
              ${user.isActive ? 'Aktiv' : 'Deaktiv'}
            </span>
          </td>
          <td>${createdAt}</td>
          <td class="text-nowrap">
            <div class="d-flex gap-1">
              <!-- Şifrə dəyişmə düyməsi -->
              <button class="btn btn-sm btn-outline-primary change-password-btn" 
                      data-username="${user.username}" 
                      data-bs-toggle="modal" 
                      data-bs-target="#changePasswordModal"
                      title="Şifrəni dəyiş"
                      ${isSuperAdmin && !isCurrentUser ? 'disabled' : ''}
                      style="min-width: 80px;">
                <i class="fas fa-key me-1"></i> Dəyiş
              </button>
              
              <!-- Silmə düyməsi -->
              <button class="btn btn-sm btn-outline-danger delete-user-btn" 
                      data-username="${user.username}"
                      title="İstifadəçini sil"
                      ${isSuperAdmin || isCurrentUser ? 'disabled' : ''}
                      style="min-width: 80px;">
                <i class="fas fa-trash me-1"></i> Sil
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Update counts
    document.getElementById('users-count').textContent = users.length;
  }

  // Change password handler
  async function handleChangePassword(username, newPassword) {
    try {
      await api.patch(`/users/${username}/password`, {
        newPassword: newPassword
      }, {
        headers: { 'Authorization': 'Bearer ' + getToken() }
      });
      
      alert('Şifrə uğurla dəyişdirildi');
      return true;
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Şifrə dəyişdirilərkən xəta baş verdi: ' + (error.message || 'Bilinməyən xəta'));
      return false;
    }
  }

  // Delete user handler
  async function handleDeleteUser(username) {
    if (!username) {
      console.error('Username is required for deletion');
      return false;
    }
    
    if (!confirm(`"${username}" istifadəçisini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`)) {
      return false;
    }

    try {
      await api.delete(`/users/${username}`, {
        headers: { 'Authorization': 'Bearer ' + getToken() }
      });
      
      alert('İstifadəçi uğurla silindi');
      loadUsers(); // Reload the users list
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('İstifadəçi silinərkən xəta baş verdi: ' + (error.message || 'Bilinməyən xəta'));
      return false;
    }
  }

  // Initialize events
  function initEvents() {
    // Initialize user action buttons
    initUserButtons();
    
    // Auto-load users when page loads
    loadUsers();
    
    // Initialize modals
    initModals();
  }
  
  // Initialize modals
  function initModals() {
    // Change password form submission
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const username = form.dataset.username;
        const newPassword = form.querySelector('input[name="newPassword"]').value;
        const confirmPassword = form.querySelector('input[name="confirmPassword"]').value;
        
        if (newPassword !== confirmPassword) {
          alert('Yeni şifrələr eyni deyil!');
          return;
        }
        
        const success = await handleChangePassword(username, newPassword);
        if (success) {
          // Hide modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
          if (modal) modal.hide();
          // Reset form
          form.reset();
        }
      });
    }
    
    // Set up modal show event to update username
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) {
      changePasswordModal.addEventListener('show.bs.modal', (e) => {
        const button = e.relatedTarget;
        const username = button.getAttribute('data-username');
        const modal = e.target;
        const usernameSpan = modal.querySelector('#modal-username');
        const form = modal.querySelector('form');
        
        if (usernameSpan) usernameSpan.textContent = username;
        if (form) form.dataset.username = username;
      });
    }
  }
  
  // Initialize user action buttons
  function initUserButtons() {
    // Remove existing event listeners to prevent duplicates
    document.removeEventListener('click', handleUserActions);
    
    // Add new event listener for user actions
    document.addEventListener('click', handleUserActions);
  }
  
  // Handle user actions (delete, change password, etc.)
  function handleUserActions(e) {
    // Handle delete button
    const deleteBtn = e.target.closest('.delete-user-btn');
    if (deleteBtn && !deleteBtn.disabled) {
      e.preventDefault();
      const username = deleteBtn.dataset.username;
      handleDeleteUser(username);
      return;
    }
    
    // Handle change password button
    const changePwdBtn = e.target.closest('.change-password-btn');
    if (changePwdBtn && !changePwdBtn.disabled) {
      e.preventDefault();
      const username = changePwdBtn.dataset.username;
      // Show change password modal
      const modalEl = document.getElementById('changePasswordModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        const usernameInput = modalEl.querySelector('input[name="username"]');
        if (usernameInput) usernameInput.value = username;
        modal.show();
      }
    }
  }
    
    // Change password modal and form handling
    const changePasswordModal = document.getElementById('changePasswordModal');
    const changePasswordForm = document.getElementById('change-password-form') || document.getElementById('changePasswordForm');
    
    // Set up modal show event
    if (changePasswordModal) {
      changePasswordModal.addEventListener('show.bs.modal', (e) => {
        const button = e.relatedTarget;
        const username = button.getAttribute('data-username');
        const modalTitle = changePasswordModal.querySelector('.modal-title #modal-username') || 
                          changePasswordModal.querySelector('#modal-username');
        if (modalTitle) modalTitle.textContent = username;
        
        // Set username in form if it exists
        if (changePasswordForm) {
          changePasswordForm.dataset.username = username;
        }
      });
    }
    
    // Set up form submission
    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = changePasswordForm.dataset.username || 
                        (document.getElementById('modal-username')?.textContent || '').trim();
        const newPassword = document.getElementById('new-password')?.value;
        const confirmPassword = document.getElementById('confirm-password')?.value;
        
        if (!newPassword || !confirmPassword) {
          alert('Zəhmət olmasa bütün xanaları doldurun');
          return;
        }
        
        if (newPassword !== confirmPassword) {
          alert('Yeni şifrələr eyni deyil!');
          return;
        }
        
        const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;
        
        try {
          // Update button state if available
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Yadda saxlanılır...';
          }
          
          const success = await handleChangePassword(username, newPassword);
          if (success) {
            // Close the modal
            const modal = bootstrap.Modal.getInstance(changePasswordModal || document.getElementById('changePasswordModal'));
            if (modal) modal.hide();
            // Reset form
            changePasswordForm.reset();
          }
        } catch (error) {
          console.error('Error changing password:', error);
          alert('Şifrə dəyişdirilərkən xəta baş verdi: ' + (error.message || 'Bilinməyən xəta'));
        } finally {
          // Restore button state if available
          if (submitBtn) {
            submitBtn.disabled = false;
            if (originalText) submitBtn.innerHTML = originalText;
          }
        }
      });
    }
    
    // Delete user button
    document.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.delete-user-btn');
      if (deleteBtn && !deleteBtn.disabled) {
        const username = deleteBtn.dataset.username;
        await handleDeleteUser(username);
      }
    });

    // Tab change event
    const usersTab = document.getElementById('users-tab');
    if (usersTab) {
      usersTab.addEventListener('shown.bs.tab', () => {
        loadUsers();
      });
    }

    // Toggle user status
    document.addEventListener('click', async (e) => {
      const toggleBtn = e.target.closest('.toggle-user-btn');
      if (toggleBtn && !toggleBtn.disabled) {
        const username = toggleBtn.dataset.username;
        const isActive = toggleBtn.dataset.active === 'true';
        
        try {
          await api.patch(`/users/${username}`, {
            isActive: !isActive
          }, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
          });
          
          // Reload users
          loadUsers();
        } catch (error) {
          console.error('Failed to update user status:', error);
          alert('İstifadəçi statusu dəyişdirilərkən xəta baş verdi');
        }
      }
    });

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    const usersTab = document.getElementById('users');
    if (usersTab && usersTab.classList.contains('active')) {
      loadUsers();
    }
  });

  // Export functions to global scope for tab switching
  window.loadUsers = loadUsers;
}
