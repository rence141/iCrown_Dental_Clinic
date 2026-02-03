const authService = require('./authService');
const userService = require('./userService');
const MongoDB = require('./mongodb');
const fs = require('fs');
const path = require('path');

// Load environment variables for backend
try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const buf = fs.readFileSync(envPath);
        let envContent = buf.toString('utf8');
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
        console.log('Backend environment variables loaded');
    }
} catch (error) {
    console.error('Error loading environment variables in backend:', error);
}

class BackendAPI {
    constructor() {
        console.log('BackendAPI constructor starting...');
        this.mongodb = new MongoDB();
        
        try {
            this.setupIPC();
            console.log('IPC handlers registered successfully');
        } catch (error) {
            console.error('Failed to setup IPC handlers:', error);
        }
        
        // Initialize database asynchronously
        this.initializeDatabase().then(() => {
            console.log('Database initialization completed');
        }).catch(error => {
            console.error('Database initialization failed:', error);
        });
    }

    async initializeDatabase() {
        try {
            await this.mongodb.connect();
            console.log('Backend initialized with MongoDB');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            // Fallback to JSON database if MongoDB is not available
            const Database = require('./database');
            this.mongodb = new Database();
            console.log('Backend initialized with fallback JSON database');
        }
    }

    async getDatabase() {
        if (!this.mongodb) {
            console.log('Database not initialized, calling initializeDatabase...');
            await this.initializeDatabase();
        }
        console.log('getDatabase() returning MongoDB instance');
        console.log('getDatabase() this.mongodb type:', typeof this.mongodb);
        console.log('getDatabase() this.mongodb createUser method:', typeof this.mongodb.createUser);
        console.log('getDatabase() this.mongodb createSession method:', typeof this.mongodb.createSession);
        // Return the mongodb instance which has all the database methods
        return this.mongodb;
    }

    setupIPC() {
        console.log('Setting up IPC handlers...');
        const { ipcMain } = require('electron');
        
        // Authentication endpoints
        ipcMain.handle('auth:register', async (event, userData) => {
            console.log('auth:register handler called with:', userData);
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                // Pass the database instance (BackendAPI) to authService
                authService.setDatabase(db);
                const result = await authService.register(userData);
                console.log('auth:register result:', result);
                // Treat a successful registration as a logged-in session
                if (result && result.user) {
                    global.currentUser = Object.assign({}, result.user);
                }
                return result;
            } catch (error) {
                console.error('auth:register error:', error);
                throw { message: error.message, code: 'AUTH_ERROR' };
            }
        });
        
        console.log('auth:register handler registered successfully');

        ipcMain.handle('auth:login', async (event, email, password) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                // Pass the database instance (BackendAPI) to authService
                authService.setDatabase(db);
                const result = await authService.login(email, password);
                // Persist the authenticated user in-memory so auth:getCurrentUser
                // can restore the session on the renderer side after reload.
                if (result && result.user) {
                    global.currentUser = Object.assign({}, result.user);
                }
                return result;
            } catch (error) {
                throw { message: error.message, code: 'AUTH_ERROR' };
            }
        });

        ipcMain.handle('auth:validate', async (event, sessionId) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                // Pass the database instance (BackendAPI) to authService
                authService.setDatabase(db);
                return await authService.validateSession(sessionId);
            } catch (error) {
                throw { message: error.message, code: 'AUTH_ERROR' };
            }
        });

        ipcMain.handle('auth:logout', async (event, sessionId) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                // Pass the database instance (BackendAPI) to authService
                authService.setDatabase(db);
                await authService.logout(sessionId);
                // Clear any in-memory user so getCurrentUser stops reporting logged-in state
                global.currentUser = null;
                return { success: true };
            } catch (error) {
                throw { message: error.message, code: 'AUTH_ERROR' };
            }
        });

        ipcMain.handle('auth:logoutAll', async (event, userId) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                // Pass the database instance (BackendAPI) to authService
                authService.setDatabase(db);
                await authService.logoutAllSessions(userId);
                // Clear in-memory user as well, so future getCurrentUser calls
                // do not report an authenticated session.
                if (global.currentUser && global.currentUser.id === userId) {
                    global.currentUser = null;
                }
                return { success: true };
            } catch (error) {
                throw { message: error.message, code: 'AUTH_ERROR' };
            }
        });

        ipcMain.handle('auth:googleLogin', async (event, googleToken) => {
            console.log('auth:googleLogin handler called');
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                // Pass the database instance (BackendAPI) to authService
                authService.setDatabase(db);
                const result = await authService.googleLogin(googleToken);
                console.log('auth:googleLogin result:', result);
                return result;
            } catch (error) {
                console.error('auth:googleLogin error:', error);
                throw { message: error.message, code: 'AUTH_ERROR' };
            }
        });

        // Google OAuth configuration endpoint
        ipcMain.handle('auth:googleConfig', async () => {
            try {
                console.log('auth:googleConfig handler called');

                // Resolve clientId from environment first, then fall back to parsing .env.local
                let clientId = process.env.GOOGLE_CLIENT_ID;
                console.log('GOOGLE_CLIENT_ID from env (raw):', clientId);

                if (!clientId) {
                    try {
                        const envPath = path.join(__dirname, '..', '.env.local');
                        if (fs.existsSync(envPath)) {
                            let buf = fs.readFileSync(envPath);
                            if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
                                buf = buf.slice(3);
                            }
                            let envContent = buf.toString('utf8');
                            if (envContent.includes('\uFFFD')) envContent = fs.readFileSync(envPath, 'latin1');
                            envContent = envContent.replace(/^\uFEFF/, '').replace(/\uFFFD/g, '');

                            // Try to extract GOOGLE_CLIENT_ID from the file reliably (search anywhere in file)
                            const globalMatch = envContent.match(/GOOGLE_CLIENT_ID\s*=\s*(.+)/i);
                            if (globalMatch && globalMatch[1]) {
                                // Trim and remove surrounding quotes and non-printable chars
                                let rawVal = globalMatch[1].split(/\r?\n/)[0].trim();
                                rawVal = rawVal.replace(/^['\"]|['\"]$/g, '');
                                rawVal = rawVal.replace(/^[^\x21-\x7E]+|[^\x21-\x7E]+$/g, '');
                                clientId = rawVal;
                                console.log('GOOGLE_CLIENT_ID parsed from .env.local (sanitized):', clientId ? 'FOUND' : 'EMPTY');
                            }
                        }
                    } catch (readErr) {
                        console.error('Failed to read .env.local for GOOGLE_CLIENT_ID fallback:', readErr);
                    }
                }

                const config = {
                    clientId: clientId || null,
                    redirectUri: 'http://localhost:3001',
                    scope: 'email profile openid'
                };

                // If clientId couldn't be resolved, fall back to a development default
                if (!config.clientId) {
                    const devFallback = '95438536693-2ojai96af4ek1j60veda9g72d350rltp.apps.googleusercontent.com';
                    console.warn('GOOGLE_CLIENT_ID not found; using development fallback (only for local testing).');
                    config.clientId = devFallback;
                }

                console.log('Returning Google OAuth config:', config);
                return config;
            } catch (error) {
                console.error('auth:googleConfig error:', error);
                throw { message: 'Failed to get Google OAuth configuration', code: 'CONFIG_ERROR' };
            }
        });

        // Get current user endpoint
        ipcMain.handle('auth:getCurrentUser', async () => {
            try {
                // Check if user is logged in in main process memory
                const currentUser = global.currentUser;
                console.log('auth:getCurrentUser called - currentUser present?:', !!currentUser);
                if (currentUser) {
                    // Return a shallow copy to avoid exposing internal objects
                    return { user: Object.assign({}, currentUser) };
                }
                // No in-memory user means no active session; do NOT auto-recover
                // from the database, otherwise logout cannot reliably keep
                // users signed out. Always return null here when currentUser
                // is not set.
                return null;
            } catch (error) {
                console.error('auth:getCurrentUser error:', error);
                return null;
            }
        });

        // User endpoints
        ipcMain.handle('user:profile', async (event, userId) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                userService.setDatabase(db);
                return await userService.getUserProfile(userId);
            } catch (error) {
                throw { message: error.message, code: 'USER_ERROR' };
            }
        });

        ipcMain.handle('user:update', async (event, userId, updateData) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                userService.setDatabase(db);
                return await userService.updateProfile(userId, updateData);
            } catch (error) {
                throw { message: error.message, code: 'USER_ERROR' };
            }
        });

        ipcMain.handle('user:changePassword', async (event, userId, currentPassword, newPassword) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                userService.setDatabase(db);
                await userService.changePassword(userId, currentPassword, newPassword);
                return { success: true };
            } catch (error) {
                throw { message: error.message, code: 'USER_ERROR' };
            }
        });

        ipcMain.handle('user:delete', async (event, userId) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                userService.setDatabase(db);
                await userService.deleteUser(userId);
                return { success: true };
            } catch (error) {
                throw { message: error.message, code: 'USER_ERROR' };
            }
        });

        // Appointment endpoints
        ipcMain.handle('appointment:create', async (event, appointmentData) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                return await db.createAppointment(appointmentData);
            } catch (error) {
                throw { message: error.message, code: 'APPOINTMENT_ERROR' };
            }
        });

        ipcMain.handle('appointment:getByPatient', async (event, patientId) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                return await db.findAppointmentsByPatientId(patientId);
            } catch (error) {
                throw { message: error.message, code: 'APPOINTMENT_ERROR' };
            }
        });

        ipcMain.handle('appointment:getAvailableSlots', async (event, date, serviceId) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                return await db.findAvailableSlots(date, serviceId);
            } catch (error) {
                throw { message: error.message, code: 'APPOINTMENT_ERROR' };
            }
        });

        ipcMain.handle('appointment:update', async (event, appointmentId, updateData) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                return await db.updateAppointment(appointmentId, updateData);
            } catch (error) {
                throw { message: error.message, code: 'APPOINTMENT_ERROR' };
            }
        });

        ipcMain.handle('appointment:delete', async (event, appointmentId) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                await db.deleteAppointment(appointmentId);
                return { success: true };
            } catch (error) {
                throw { message: error.message, code: 'APPOINTMENT_ERROR' };
            }
        });

        ipcMain.handle('appointment:getAll', async () => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                return await db.getAllAppointments();
            } catch (error) {
                throw { message: error.message, code: 'APPOINTMENT_ERROR' };
            }
        });

        // Medical Records endpoints
        ipcMain.handle('medical:create', async (event, recordData) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                return await db.createMedicalRecord(recordData);
            } catch (error) {
                throw { message: error.message, code: 'MEDICAL_ERROR' };
            }
        });

        ipcMain.handle('medical:getByPatient', async (event, patientId) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                return await db.findMedicalRecordsByPatientId(patientId);
            } catch (error) {
                throw { message: error.message, code: 'MEDICAL_ERROR' };
            }
        });

        // Analytics endpoints
        ipcMain.handle('analytics:appointmentStats', async (event, startDate, endDate) => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                return await db.getAppointmentStats(startDate, endDate);
            } catch (error) {
                throw { message: error.message, code: 'ANALYTICS_ERROR' };
            }
        });

        ipcMain.handle('analytics:patientStats', async () => {
            try {
                // Get the database (ensures it's initialized)
                const db = await this.getDatabase();
                return await db.getPatientStats();
            } catch (error) {
                throw { message: error.message, code: 'ANALYTICS_ERROR' };
            }
        });

        // System endpoints
        ipcMain.handle('system:info', async () => {
            try {
                const os = require('os');
                const process = require('process');
                
                return {
                    platform: os.platform(),
                    arch: os.arch(),
                    nodeVersion: process.versions.node,
                    electronVersion: process.versions.electron,
                    hostname: os.hostname(),
                    uptime: os.uptime(),
                    totalMemory: os.totalmem(),
                    freeMemory: os.freemem(),
                    cpuCount: os.cpus().length
                };
            } catch (error) {
                throw { message: error.message, code: 'SYSTEM_ERROR' };
            }
        });

        // Window helpers
        ipcMain.handle('window:openExternal', async (event, targetUrl) => {
            try {
                const { shell } = require('electron');
                await shell.openExternal(targetUrl);
                return { success: true };
            } catch (error) {
                console.error('window:openExternal error:', error);
                throw { message: error.message, code: 'WINDOW_ERROR' };
            }
        });

        // Open an in-app BrowserWindow for OAuth so it can be closed programmatically
        ipcMain.handle('auth:openAuthWindow', async (event, authUrl) => {
            try {
                const { BrowserWindow } = require('electron');
                // Parse the authUrl to extract the client_id used to initiate the flow
                let initiatingClientId = null;
                try {
                    const parsedAuthUrl = new URL(authUrl);
                    initiatingClientId = parsedAuthUrl.searchParams.get('client_id');
                    console.log('auth:openAuthWindow - initiating client_id:', initiatingClientId);
                } catch (e) {
                    // ignore parse errors
                }
                const authWin = new BrowserWindow({
                    width: 600,
                    height: 800,
                    show: true,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true
                    }
                });

                const redirectBase = 'http://localhost:3001';

                // Helper to attempt extracting id_token from fragment when redirect occurs
                const tryExtractIdToken = async () => {
                    try {
                        // Execute script inside the auth window to read location.hash
                        const hash = await authWin.webContents.executeJavaScript('location.hash');
                        if (!hash) return null;
                        // hash format: #id_token=...&access_token=...&...
                        const params = new URLSearchParams(hash.replace(/^#/, ''));
                        const idToken = params.get('id_token');
                        return idToken || null;
                    } catch (e) {
                        return null;
                    }
                };

                const handlePossibleRedirect = async (newUrl) => {
                    try {
                        if (!newUrl) return;
                        if (newUrl.startsWith(redirectBase)) {
                            // Try to get id_token from fragment
                            const idToken = await tryExtractIdToken();
                            if (idToken) {
                                // Ensure database is available and authService has DB
                                const db = await this.getDatabase();
                                authService.setDatabase(db);

                                // Use authService to process the id_token (will create/update user + session)
                                try {
                                    const result = await authService.googleLogin(idToken, initiatingClientId || process.env.GOOGLE_CLIENT_ID);
                                    console.log('auth:openAuthWindow - googleLogin result:', result);
                                    // Set global current user so renderer can pick it up
                                    global.currentUser = result.user;

                                    // Notify renderer windows that a user has just logged in
                                    try {
                                        const { BrowserWindow } = require('electron');
                                        const wins = BrowserWindow.getAllWindows();
                                        wins.forEach(w => {
                                            try {
                                                if (w && w.webContents && !w.isDestroyed()) {
                                                    w.webContents.send('auth:logged-in', result.user);
                                                }
                                            } catch (e) {}
                                        });
                                    } catch (e) {}
                                } catch (loginErr) {
                                    console.error('auth:openAuthWindow - googleLogin failed:', loginErr);
                                }

                                // Close window shortly after handling
                                setTimeout(() => {
                                    if (!authWin.isDestroyed()) authWin.close();
                                }, 600);
                            } else {
                                // If no id_token in fragment, attempt to POST code via server by letting page load
                                // and rely on server-side handling added earlier
                                setTimeout(() => {
                                    if (!authWin.isDestroyed()) authWin.close();
                                }, 1200);
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                };

                authWin.webContents.on('will-redirect', (event, newUrl) => {
                    handlePossibleRedirect(newUrl);
                });

                authWin.webContents.on('will-navigate', (event, newUrl) => {
                    handlePossibleRedirect(newUrl);
                });

                // Also check after page finishes loading in case fragment present
                authWin.webContents.on('did-finish-load', async () => {
                    const currentUrl = authWin.webContents.getURL();
                    await handlePossibleRedirect(currentUrl);
                });

                authWin.loadURL(authUrl);

                authWin.on('closed', () => {
                    // nothing to do
                });

                return { success: true };
            } catch (error) {
                console.error('auth:openAuthWindow error:', error);
                throw { message: error.message, code: 'AUTH_WINDOW_ERROR' };
            }
        });

        // File operations
        ipcMain.handle('file:read', async (event, filePath) => {
            try {
                const fs = require('fs').promises;
                return await fs.readFile(filePath, 'utf8');
            } catch (error) {
                throw { message: error.message, code: 'FILE_ERROR' };
            }
        });

        ipcMain.handle('file:write', async (event, filePath, content) => {
            try {
                const fs = require('fs').promises;
                await fs.writeFile(filePath, content, 'utf8');
                return { success: true };
            } catch (error) {
                throw { message: error.message, code: 'FILE_ERROR' };
            }
        });
    }
}

console.log('BackendAPI module loaded successfully');

module.exports = BackendAPI;
