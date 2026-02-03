const database = require('./database');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

console.log('AuthService module loaded');

// Initialize Google OAuth Client fallback value (must match main.js /google-config)
// Use a single, consistent client ID everywhere to avoid "Invalid client"/audience errors.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '95438536693-2ojai96af4ek1j60veda9g72d350rltp.apps.googleusercontent.com';

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

    async googleLogin(googleToken, expectedAudience) {
        console.log('AuthService.googleLogin called with token:', googleToken ? 'present' : 'missing');
        console.log('AuthService.googleLogin - database implementation:', this.db && this.db.constructor ? this.db.constructor.name : typeof this.db);
        
        try {
            // Determine which client ID to use for verification (caller can supply expectedAudience)
            const clientIdToUse = expectedAudience || process.env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;
            console.log('AuthService.googleLogin using clientId:', clientIdToUse);
            const runtimeGoogleClient = new OAuth2Client(clientIdToUse);
            const ticket = await runtimeGoogleClient.verifyIdToken({
                idToken: googleToken,
                audience: clientIdToUse
            });

            const payload = ticket.getPayload();
            console.log('Google OAuth payload:', payload);

            if (!payload) {
                throw new Error('Invalid Google token payload');
            }

            // Extract user information from Google
            const googleProfile = {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                firstName: payload.given_name,
                lastName: payload.family_name,
                avatar: payload.picture,
                emailVerified: payload.email_verified,
                provider: 'google'
            };

            // Validate required fields
            if (!googleProfile.email || !googleProfile.name) {
                throw new Error('Invalid Google profile: missing required fields');
            }

            // Check if user already exists
            let user = await this.db.findUserByEmail(googleProfile.email);
            
            if (!user) {
                // Create new user from Google profile
                console.log('Creating new user from Google profile:', googleProfile.email);
                user = await this.db.createUser({
                    name: googleProfile.name,
                    firstName: googleProfile.firstName,
                    lastName: googleProfile.lastName,
                    email: googleProfile.email,
                    password: this.hashPassword(this.generateToken()), // Random password for Google users
                    role: 'patient', // Default role for Google users
                    avatar: googleProfile.avatar,
                    provider: 'google',
                    providerId: googleProfile.id,
                    isEmailVerified: googleProfile.emailVerified,
                    createdAt: new Date().toISOString()
                });
                console.log('Created user via db.createUser:', user);
            } else {
                // Update existing user with latest Google info
                console.log('Updating existing user with Google info:', user.email);
                const updateData = {
                    name: googleProfile.name || user.name,
                    firstName: googleProfile.firstName || user.firstName,
                    lastName: googleProfile.lastName || user.lastName,
                    avatar: googleProfile.avatar || user.avatar,
                    isEmailVerified: googleProfile.emailVerified || user.isEmailVerified,
                    lastLoginAt: new Date().toISOString()
                };

                // Always set provider info to ensure linkage
                updateData.provider = 'google';
                updateData.providerId = googleProfile.id;

                await this.db.updateUser(user.id, updateData);

                const refreshed = await this.db.findUserById(user.id);
                console.log('After update, refreshed user:', refreshed);

                // Refresh user data after update
                user = await this.db.findUserById(user.id);
            }

            // Create session correctly using session object
            const sessionToken = this.generateToken();
            const sessionPayload = {
                userId: user.id,
                sessionId: sessionToken,
                userAgent: 'Google OAuth'
            };

            const session = await this.db.createSession(sessionPayload);
            console.log('Created session via db.createSession:', session);

            // Return sanitized user and session
            const sanitizedUser = {
                id: user.id,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role || 'patient',
                avatar: user.avatar || googleProfile.avatar,
                provider: user.provider || 'google',
                isEmailVerified: user.isEmailVerified || googleProfile.emailVerified
            };

            return {
                user: sanitizedUser,
                session: {
                    sessionId: sessionToken,
                    expiresAt: session.expiresAt
                }
            };
        } catch (error) {
            console.error('Google login error:', error);
            
            // Provide specific error messages
            if (error.message.includes('invalid_token')) {
                throw new Error('Invalid Google authentication token');
            } else if (error.message.includes('audience')) {
                throw new Error('Google authentication failed: Invalid client');
            } else {
                throw new Error('Google authentication failed: ' + error.message);
            }
        }
    }
}

module.exports = new AuthService();
