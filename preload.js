const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication APIs
  auth: {
    register: (userData) => ipcRenderer.invoke('auth:register', userData),
    login: (email, password) => ipcRenderer.invoke('auth:login', email, password),
    validate: (sessionId) => ipcRenderer.invoke('auth:validate', sessionId),
    logout: (sessionId) => ipcRenderer.invoke('auth:logout', sessionId),
    logoutAll: (userId) => ipcRenderer.invoke('auth:logoutAll', userId)
  },
  
  // User APIs
  user: {
    getProfile: (userId) => ipcRenderer.invoke('user:profile', userId),
    updateProfile: (userId, updateData) => ipcRenderer.invoke('user:update', userId, updateData),
    changePassword: (userId, currentPassword, newPassword) => ipcRenderer.invoke('user:changePassword', userId, currentPassword, newPassword),
    deleteAccount: (userId) => ipcRenderer.invoke('user:delete', userId)
  },
  
  // System APIs
  system: {
    getInfo: () => ipcRenderer.invoke('system:info')
  },
  
  // File APIs
  file: {
    read: (filePath) => ipcRenderer.invoke('file:read', filePath),
    write: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content)
  },
  
  // Legacy APIs for compatibility
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
  openDevTools: () => ipcRenderer.invoke('window:openDevTools'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  sendMessage: (message) => ipcRenderer.invoke('message', message),
  onMessage: (callback) => ipcRenderer.on('message', callback)
});
