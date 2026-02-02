const authService = require('./authService');
const userService = require('./userService');
const MongoDB = require('./mongodb');

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
                return await authService.login(email, password);
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
                return { success: true };
            } catch (error) {
                throw { message: error.message, code: 'AUTH_ERROR' };
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
