const { app, BrowserWindow } = require('electron');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Backend API
let backendAPI;
try {
    const BackendAPI = require('./backend/index.js');
    backendAPI = new BackendAPI();
    console.log('Backend API initialized successfully');
} catch (error) {
    console.error('Failed to initialize Backend API:', error);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-simple.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    titleBarStyle: 'default',
    show: false
  });

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; " +
          "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; " +
          "img-src 'self' data: https:; " +
          "connect-src 'self' https:; " +
          "frame-src 'none';"
        ]
      }
    });
  });

  // Load the React app
  mainWindow.loadFile('frontend/index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
