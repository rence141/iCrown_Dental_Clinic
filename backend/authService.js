const database = require('./database');
const crypto = require('crypto');

console.log('AuthService module loaded');

class AuthService {
    constructor() {
        this.backendAPI = null;
    }

    setBackendAPI(backendAPI) {
        console.log('AuthService.setBackendAPI called with:', backendAPI);
        this.backendAPI = backendAPI;
    }

    setDatabase(database) {
        console.log('AuthService.setDatabase called with:', database);
        console.log('AuthService.setDatabase type:', typeof database);
        console.log('AuthService.setDatabase methods:', database ? Object.getOwnPropertyNames(database) : 'null');
        console.log('AuthService.setDatabase createUser method:', typeof database.createUser);
        console.log('AuthService.setDatabase createSession method:', typeof database.createSession);
        console.log('AuthService.setDatabase prototype methods:', database ? Object.getOwnPropertyNames(Object.getPrototypeOf(database)) : 'null');
        this.db = database;
    }

    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    hashPassword(password) {
        // Simple hash for demo - in production use bcrypt
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    async register(userData) {
        console.log('AuthService.register called with userData:', userData);
        console.log('AuthService.register this.db:', this.db);
        console.log('AuthService.register this.db type:', typeof this.db);
        
        const { name, email, password } = userData;

        // Validate input
        if (!name || !email || !password) {
            throw new Error('All fields are required');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Hash password
        const hashedPassword = this.hashPassword(password);

        // Create user using BackendAPI (passed as this.db)
        console.log('AuthService.register calling this.db.createUser...');
        const newUser = await this.db.createUser({
            name,
            email,
            password: hashedPassword,
            role: 'customer'
        });

        // Create session using BackendAPI (passed as this.db)
        const sessionToken = this.generateToken();
        const session = await this.db.createSession({
            userId: newUser.id,
            sessionId: sessionToken,
            userAgent: 'Electron App'
        });

        return {
            user: newUser,
            session: session
        };
    }

    async login(email, password) {
        // Validate input
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Find user using BackendAPI (passed as this.db)
        const user = await this.db.findUserByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check password
        const hashedPassword = this.hashPassword(password);
        if (user.password !== hashedPassword) {
            throw new Error('Invalid credentials');
        }

        // Create session using BackendAPI (passed as this.db)
        const sessionToken = this.generateToken();
        const session = await this.db.createSession({
            userId: user.id,
            sessionId: sessionToken,
            userAgent: 'Electron App'
        });

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            session
        };
    }

    async validateSession(sessionId) {
        const session = await this.db.findSession(sessionId);
        
        if (!session) {
            throw new Error('Invalid session');
        }

        const user = await this.db.findUserById(session.userId);
        if (!user) {
            await this.db.deleteSession(sessionId);
            throw new Error('User not found');
        }

        // Return user without password
        const { password, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            session
        };
    }

    async logout(sessionId) {
        await this.db.deleteSession(sessionId);
    }

    async logoutAllSessions(userId) {
        await this.db.deleteAllUserSessions(userId);
    }
}

module.exports = new AuthService();
