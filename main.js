const { app, BrowserWindow } = require('electron');
const path = require('path');

// Load environment variables
const fs = require('fs');

// Load .env.local directly since dotenv is having issues
try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        // Read file as a buffer and handle BOMs/replacement chars robustly
        let envContent;
        try {
          const buf = fs.readFileSync(envPath);
          // If UTF-8 BOM (0xEF,0xBB,0xBF) is present, strip the first three bytes
          if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
            envContent = buf.slice(3).toString('utf8');
          } else {
            // Try utf8 decoding first; if it contains replacement chars, fall back to latin1
            envContent = buf.toString('utf8');
            if (envContent.includes('\uFFFD')) {
              envContent = buf.toString('latin1');
            }
          }
        } catch (encodingError) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }

        console.log('Raw file content (first 100 chars):', envContent.substring(0, 100));

        // Remove any U+FEFF or replacement characters that may remain
        envContent = envContent.replace(/^\uFEFF/, '');
        envContent = envContent.replace(/\uFFFD/g, '');

        // Aggressive cleanup of non-word noise that sometimes precedes variable names
        envContent = envContent.replace(/[^\w]*MONGODB_URI/g, 'MONGODB_URI');
        envContent = envContent.replace(/[^\w]*DB_NAME/g, 'DB_NAME');

        console.log('Cleaned file content (first 100 chars):', envContent.substring(0, 100));
        
        const lines = envContent.split('\n');
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const equalIndex = trimmedLine.indexOf('=');
                if (equalIndex > 0) {
                    let key = trimmedLine.substring(0, equalIndex).trim();
                    const value = trimmedLine.substring(equalIndex + 1).trim();
                    // Remove any leading non-word characters that may be present due to encoding noise
                    key = key.replace(/^[^\w]+/, '');
                    process.env[key] = value;
                    console.log(`Loaded: ${key} = ${value.substring(0, 50)}...`);
                }
            }
        });
        console.log('Environment variables loaded from .env.local');
    } else {
        console.log('.env.local file not found at:', envPath);
    }
} catch (error) {
    console.error('Error loading environment variables:', error);
}

// Debug environment variables
console.log('Environment variables loaded:');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('.env.local exists:', fs.existsSync('.env.local'));
console.log('Absolute .env.local exists:', fs.existsSync(path.join(__dirname, '.env.local')));
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
if (process.env.MONGODB_URI) {
    console.log('MongoDB URI preview:', process.env.MONGODB_URI.substring(0, 50) + '...');
} else {
    // Try to read the file directly for debugging
    if (fs.existsSync('.env.local')) {
        const content = fs.readFileSync('.env.local', 'utf8');
        console.log('File content preview:', content.substring(0, 100));
    }
}

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
