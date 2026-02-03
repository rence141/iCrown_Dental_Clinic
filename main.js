const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const url = require('url');
const https = require('https');

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
// Track whether the local OAuth server has already been started
let oauthServerStarted = false;
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
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://accounts.google.com; " +
          "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://accounts.google.com; " +
          "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; " +
          "img-src 'self' data: https: https://lh3.googleusercontent.com; " +
          "connect-src 'self' https: https://oauth2.googleapis.com https://www.googleapis.com; " +
          "frame-src 'self' https://accounts.google.com https://apis.google.com;"
        ]
      }
    });
  });

  // Load the React app
  mainWindow.loadFile('frontend/index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Create simple HTTP server for Google OAuth configuration
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (parsedUrl.pathname === '/google-config' && req.method === 'GET') {
      // Load environment variables (same logic as main process)
      let envContent = '';
      try {
        const envPath = path.join(__dirname, '.env.local');
        if (fs.existsSync(envPath)) {
          const buf = fs.readFileSync(envPath);
          envContent = buf.toString('utf8');
          if (envContent.includes('\uFFFD')) envContent = buf.toString('latin1');
          envContent = envContent.replace(/^\uFEFF/, '').replace(/\uFFFD/g, '');
          
          const lines = envContent.split('\n');
          lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
              const equalIndex = trimmedLine.indexOf('=');
              if (equalIndex > 0) {
                const key = trimmedLine.substring(0, equalIndex).trim();
                const value = trimmedLine.substring(equalIndex + 1).trim();
                process.env[key] = value;
              }
            }
          });
        }
      } catch (error) {
        console.error('Error loading environment variables for HTTP server:', error);
      }
      
      // Serve Google OAuth configuration
      const config = {
        clientId: process.env.GOOGLE_CLIENT_ID || '95438536693-2ojai96af4ek1j60veda9g72d350rltp.apps.googleusercontent.com',
        redirectUri: 'http://localhost:3001', // Change port to 3001
        scope: 'email profile openid'
      };
      
      console.log('HTTP Server - Google Config:', config);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config));
    } else if (parsedUrl.pathname === '/google-auth-callback' && req.method === 'POST') {
      // Handle Google OAuth callback: accept either an id_token directly
      // (fragment-based implicit flow) or a code that we exchange for tokens.
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });

      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const idTokenDirect = payload.id_token || payload.idToken || null;
          const code = payload.code || null;

          const authService = require('./backend/authService');
          const db = backendAPI ? await backendAPI.getDatabase() : null;
          if (authService && db) authService.setDatabase(db);

          if (idTokenDirect) {
            console.log('Received id_token directly via POST');
            try {
              const result = await authService.googleLogin(idTokenDirect, process.env.GOOGLE_CLIENT_ID);
              console.log('googleLogin result:', result);
              global.currentUser = result.user;
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
              return;
            } catch (e) {
              console.error('Error processing direct id_token with authService:', e);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: e.message }));
              return;
            }
          }

          if (code) {
            console.log('Received authorization code via POST:', code);
            // Exchange code for tokens at Google's token endpoint
            const postData = new URLSearchParams({
              code: code,
              client_id: process.env.GOOGLE_CLIENT_ID,
              client_secret: process.env.GOOGLE_CLIENT_SECRET,
              redirect_uri: 'http://localhost:3001',
              grant_type: 'authorization_code'
            }).toString();

            const tokenReq = https.request(
              {
                hostname: 'oauth2.googleapis.com',
                path: '/token',
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Content-Length': Buffer.byteLength(postData)
                }
              },
              async (tokenRes) => {
                let tokenBody = '';
                tokenRes.on('data', chunk => tokenBody += chunk.toString());
                tokenRes.on('end', async () => {
                  try {
                    const tokenJson = JSON.parse(tokenBody);
                    console.log('Token response from Google:', tokenJson);

                    const idToken = tokenJson.id_token || null;
                    if (!idToken) {
                      console.error('No id_token received from Google token endpoint');
                      res.writeHead(500, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'No id_token' }));
                      return;
                    }

                    try {
                      const result = await authService.googleLogin(idToken, process.env.GOOGLE_CLIENT_ID);
                      console.log('googleLogin result:', result);
                      global.currentUser = result.user;
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: true }));
                    } catch (e) {
                      console.error('Error processing id_token with authService:', e);
                      res.writeHead(500, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: e.message }));
                    }
                  } catch (parseErr) {
                    console.error('Failed to parse token response:', parseErr, tokenBody);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid token response' }));
                  }
                });
              }
            );

            tokenReq.on('error', (err) => {
              console.error('Token request error:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            });

            tokenReq.write(postData);
            tokenReq.end();
            return;
          }

          // No recognizable payload
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'No id_token or code provided' }));
        } catch (error) {
          console.error('Error handling /google-auth-callback POST:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });
    } else {
      // Serve OAuth callback for any path that contains a `code` query param
      if (parsedUrl.query && parsedUrl.query.code) {
        const code = parsedUrl.query.code;
        const state = parsedUrl.query.state || '';
        console.log('HTTP Server - OAuth redirect received on path', parsedUrl.pathname, 'code present');
        const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>OAuth Callback</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Match the gold gradient vibe from the login left panel */
        background: linear-gradient(135deg, #d4af37 0%, #f4e4bc 50%, #c0c0c0 100%);
        color: #1a1a1a;
      }
      .card {
        background: #ffffff;
        border-radius: 18px;
        padding: 24px 28px;
        max-width: 420px;
        width: 100%;
        box-shadow:
          0 22px 45px rgba(0, 0, 0, 0.22),
          0 0 0 1px rgba(212, 175, 55, 0.4);
        text-align: left;
      }
      .header-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }
      .spinner {
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 3px solid rgba(212, 175, 55, 0.25);
        border-top-color: #d4af37;
        animation: spin 0.8s linear infinite;
      }
      h2 {
        font-size: 20px;
        font-weight: 700;
        color: #1a1a1a;
      }
      p.subtitle {
        margin-top: 4px;
        font-size: 14px;
        color: #4b5563;
      }
      #status {
        margin-top: 16px;
        padding: 10px 12px;
        border-radius: 10px;
        background: #fff9e6;
        border: 1px solid rgba(212, 175, 55, 0.35);
        font-size: 13px;
        color: #374151;
        white-space: pre-wrap;
      }
      .hint {
        margin-top: 10px;
        font-size: 12px;
        color: #6b7280;
      }
      .hint span {
        font-weight: 600;
        color: #b08900;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header-row">
        <div class="spinner"></div>
        <div>
          <h2>Signing you in...</h2>
          <p class="subtitle">Please wait — this window will close automatically after sign-in.</p>
        </div>
      </div>
      <pre id="status">Processing…</pre>
      <p class="hint">You can close this window once it says <span>Sign-in complete</span>.</p>
    </div>
    <script>
      (async function(){
        try {
          const code = ${JSON.stringify(code)};
          const resp = await fetch('/google-auth-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          });
          const result = await resp.json();
          if (result && result.success) {
            document.getElementById('status').textContent = 'Sign-in complete. This window will close.';
            // Attempt to close the window when running inside Electron
            setTimeout(() => { try { window.close(); } catch(e){} }, 800);
          } else {
            let message = 'Error: ' + (result && result.error ? result.error : 'Unknown');
            if (result && result.error && result.error.includes('Invalid client')) {
              message = 'Google sign-in failed due to an invalid client configuration. Please close this window and try again after the app\\'s Google settings have been updated.';
            }
            document.getElementById('status').textContent = message;
          }
        } catch (e) {
          document.getElementById('status').textContent = 'Error: ' + e.message;
        }
      })();
    </script>
  </body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
      }

      // If no code present, serve a fallback HTML page that will try to
      // extract an ID token from the URL fragment (location.hash) and POST
      // it to the server. This handles response_type=id_token flows where
      // browsers don't send fragments to the server.
      console.log('HTTP Server - Serving fallback callback page for path', parsedUrl.pathname);
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>OAuth Callback</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Match the gold gradient vibe from the login left panel */
        background: linear-gradient(135deg, #d4af37 0%, #f4e4bc 50%, #c0c0c0 100%);
        color: #1a1a1a;
      }
      .card {
        background: #ffffff;
        border-radius: 18px;
        padding: 24px 28px;
        max-width: 420px;
        width: 100%;
        box-shadow:
          0 22px 45px rgba(0, 0, 0, 0.22),
          0 0 0 1px rgba(212, 175, 55, 0.4);
        text-align: left;
      }
      .header-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }
      .spinner {
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 3px solid rgba(212, 175, 55, 0.25);
        border-top-color: #d4af37;
        animation: spin 0.8s linear infinite;
      }
      h2 {
        font-size: 20px;
        font-weight: 700;
        color: #1a1a1a;
      }
      #msg {
        margin-top: 4px;
        font-size: 14px;
        color: #4b5563;
      }
      #status {
        margin-top: 16px;
        padding: 10px 12px;
        border-radius: 10px;
        background: #fff9e6;
        border: 1px solid rgba(212, 175, 55, 0.35);
        font-size: 13px;
        color: #374151;
        white-space: pre-wrap;
      }
      .hint {
        margin-top: 10px;
        font-size: 12px;
        color: #6b7280;
      }
      .hint span {
        font-weight: 600;
        color: #b08900;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header-row">
        <div class="spinner"></div>
        <div>
          <h2>Signing you in...</h2>
          <p id="msg">Please wait — processing authentication response.</p>
        </div>
      </div>
      <pre id="status">Waiting for Google to respond…</pre>
      <p class="hint">You can close this window once it says <span>Sign-in complete</span>.</p>
    </div>
    <script>
      (async function(){
        try {
          // If there's a fragment, it may contain id_token or access_token
          const hash = window.location.hash || '';
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          const idToken = params.get('id_token');
          const code = (new URLSearchParams(window.location.search)).get('code');

          if (idToken) {
            document.getElementById('status').textContent = 'Found id_token in fragment — sending to app...';
            const resp = await fetch('/google-auth-callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_token: idToken })
            });
            const result = await resp.json();
            document.getElementById('status').textContent = result.success ? 'Sign-in complete. This window will close.' : ('Error: ' + (result.error || 'Unknown'));
            if (result.success) setTimeout(()=>{ try{ window.close(); }catch(e){} }, 800);
            return;
          }

          if (code) {
            document.getElementById('status').textContent = 'Found code in query — sending to app...';
            const resp = await fetch('/google-auth-callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code })
            });
            const result = await resp.json();
            if (result && result.success) {
              document.getElementById('status').textContent = 'Sign-in complete. This window will close.';
              setTimeout(()=>{ try{ window.close(); }catch(e){} }, 800);
            } else {
              let message = 'Error: ' + (result && result.error ? result.error : 'Unknown');
              if (result && result.error && result.error.includes('Invalid client')) {
                message = 'Google sign-in failed due to an invalid client configuration. Please close this window and try again after the app\\'s Google settings have been updated.';
              }
              document.getElementById('status').textContent = message;
            }
            return;
          }

          document.getElementById('status').textContent = 'No token or code found in URL. Please close this window and try again.';
        } catch (e) {
          document.getElementById('status').textContent = 'Error: ' + e.message;
        }
      })();
    </script>
  </body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    }
  });

  // Start the OAuth helper server only once per app run
  if (!oauthServerStarted) {
    oauthServerStarted = true;
    server.listen(3001, () => {
      console.log('Google OAuth server running on http://localhost:3001');
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('Port 3001 is already in use. Reusing existing OAuth server instance.');
      } else {
        console.error('OAuth server error:', err);
      }
    });
  } else {
    console.log('OAuth server already started, skipping additional listen()');
  }

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
