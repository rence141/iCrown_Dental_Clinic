const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Real Authentication APIs connected to backend
  auth: {
    register: async (userData) => {
      return await ipcRenderer.invoke('auth:register', userData);
    },
    login: async (email, password) => {
      return await ipcRenderer.invoke('auth:login', email, password);
    },
    validate: async (sessionId) => {
      return await ipcRenderer.invoke('auth:validate', sessionId);
    },
    logout: async (sessionId) => {
      return await ipcRenderer.invoke('auth:logout', sessionId);
    },
    logoutAll: async (userId) => {
      return await ipcRenderer.invoke('auth:logoutAll', userId);
    }
  },
  
  // Real User APIs connected to backend
  user: {
    getProfile: async (userId) => {
      return await ipcRenderer.invoke('user:profile', userId);
    },
    updateProfile: async (userId, updateData) => {
      return await ipcRenderer.invoke('user:update', userId, updateData);
    },
    changePassword: async (userId, currentPassword, newPassword) => {
      return await ipcRenderer.invoke('user:changePassword', userId, currentPassword, newPassword);
    },
    delete: async (userId) => {
      return await ipcRenderer.invoke('user:delete', userId);
    }
  },
  
  // Appointment APIs
  appointment: {
    create: async (appointmentData) => {
      return await ipcRenderer.invoke('appointment:create', appointmentData);
    },
    getByPatient: async (patientId) => {
      return await ipcRenderer.invoke('appointment:getByPatient', patientId);
    },
    getAvailableSlots: async (date, serviceId) => {
      return await ipcRenderer.invoke('appointment:getAvailableSlots', date, serviceId);
    },
    update: async (appointmentId, updateData) => {
      return await ipcRenderer.invoke('appointment:update', appointmentId, updateData);
    },
    delete: async (appointmentId) => {
      return await ipcRenderer.invoke('appointment:delete', appointmentId);
    },
    getAll: async () => {
      return await ipcRenderer.invoke('appointment:getAll');
    }
  },
  
  // Medical Records APIs
  medical: {
    create: async (recordData) => {
      return await ipcRenderer.invoke('medical:create', recordData);
    },
    getByPatient: async (patientId) => {
      return await ipcRenderer.invoke('medical:getByPatient', patientId);
    }
  },
  
  // Analytics APIs
  analytics: {
    getAppointmentStats: async (startDate, endDate) => {
      return await ipcRenderer.invoke('analytics:appointmentStats', startDate, endDate);
    },
    getPatientStats: async () => {
      return await ipcRenderer.invoke('analytics:patientStats');
    }
  },
  
  // System APIs
  system: {
    getInfo: async () => {
      return await ipcRenderer.invoke('system:info');
    }
  },
  
  // Legacy APIs for compatibility
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
  openDevTools: () => ipcRenderer.invoke('window:openDevTools'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  
  // Generic invoke method for direct access
  invoke: (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
  }
});
