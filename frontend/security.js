// Basic Security Utilities for iCrown Dental Clinic

const SecureStorage = {
  // Simple encoding (not true encryption, but better than plain text)
  encode: (data) => {
    try {
      return btoa(JSON.stringify(data));
    } catch (error) {
      console.error('Security encode error:', error);
      return null;
    }
  },

  decode: (encodedData) => {
    try {
      return JSON.parse(atob(encodedData));
    } catch (error) {
      console.error('Security decode error:', error);
      return null;
    }
  },

  set: (key, value) => {
    const encoded = SecureStorage.encode(value);
    if (encoded) {
      localStorage.setItem(key, encoded);
    }
  },

  get: (key) => {
    const encoded = localStorage.getItem(key);
    return encoded ? SecureStorage.decode(encoded) : null;
  },

  remove: (key) => {
    localStorage.removeItem(key);
  },

  clear: () => {
    // Clear only app-related data
    const keysToRemove = ['currentUser', 'sessionId', 'theme', 'patientData'];
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
};

const SecureAuth = {
  // Secure login with basic validation
  login: (userData) => {
    // Add timestamp for session management
    const sessionData = {
      ...userData,
      loginTime: Date.now(),
      sessionExpiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    SecureStorage.set('currentUser', sessionData);
    SecureStorage.set('sessionId', `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    
    return sessionData;
  },

  logout: () => {
    SecureStorage.clear();
    window.currentUser = null;
    window.location.reload();
  },

  isSessionValid: () => {
    const userData = SecureStorage.get('currentUser');
    if (!userData) return false;
    
    // Check if session is expired
    if (userData.sessionExpiry && Date.now() > userData.sessionExpiry) {
      SecureAuth.logout();
      return false;
    }
    
    return true;
  },

  getCurrentUser: () => {
    if (SecureAuth.isSessionValid()) {
      return SecureStorage.get('currentUser');
    }
    return null;
  }
};

// Disable React DevTools in production
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
  delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
}

// Export for use in other files
window.SecureStorage = SecureStorage;
window.SecureAuth = SecureAuth;
