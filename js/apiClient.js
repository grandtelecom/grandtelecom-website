// Thin wrapper to maintain backward compatibility with existing HTML references
// Import and expose ApiClient from apiClient.new.js
import ApiClient from './apiClient.new.js';

// Expose to window for legacy scripts
if (typeof window !== 'undefined') {
  window.ApiClient = ApiClient;
}

export default ApiClient;
