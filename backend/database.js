const fs = require('fs').promises;
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'data', 'database.json');
        this.ensureDataDirectory();
    }

    async ensureDataDirectory() {
        const dataDir = path.dirname(this.dbPath);
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    async readData() {
        try {
            const data = await fs.readFile(this.dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // If file doesn't exist, return empty database structure
            return {
                users: [],
                sessions: [],
                settings: {}
            };
        }
    }

    async writeData(data) {
        await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2));
    }

    async findUserByEmail(email) {
        const data = await this.readData();
        return data.users.find(user => user.email === email);
    }

    async findUserById(id) {
        const data = await this.readData();
        return data.users.find(user => user.id === id);
    }

    async createUser(userData) {
        const data = await this.readData();
        
        // Check if email already exists
        if (data.users.some(user => user.email === userData.email)) {
            throw new Error('Email already exists');
        }

        const newUser = {
            id: Date.now().toString(),
            ...userData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        data.users.push(newUser);
        await this.writeData(data);
        
        // Return user without password
        const { password, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }

    async updateUser(id, updateData) {
        const data = await this.readData();
        const userIndex = data.users.findIndex(user => user.id === id);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        data.users[userIndex] = {
            ...data.users[userIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        await this.writeData(data);
        
        // Return user without password
        const { password, ...userWithoutPassword } = data.users[userIndex];
        return userWithoutPassword;
    }

    async createSession(sessionData) {
        const data = await this.readData();
        
        const newSession = {
            sessionId: Date.now().toString(),
            ...sessionData,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        data.sessions.push(newSession);
        await this.writeData(data);
        
        return newSession;
    }

    async findSession(sessionId) {
        const data = await this.readData();
        const session = data.sessions.find(s => s.sessionId === sessionId);
        
        if (!session) {
            return null;
        }

        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
            await this.deleteSession(sessionId);
            return null;
        }

        return session;
    }

    async deleteSession(sessionId) {
        const data = await this.readData();
        data.sessions = data.sessions.filter(session => session.sessionId !== sessionId);
        await this.writeData(data);
    }

    async deleteAllUserSessions(userId) {
        const data = await this.readData();
        data.sessions = data.sessions.filter(session => session.userId !== userId);
        await this.writeData(data);
    }
}

module.exports = Database;
