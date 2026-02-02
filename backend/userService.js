const database = require('./database');

class UserService {
    constructor() {
        this.db = null;
    }

    setDatabase(database) {
        this.db = database;
    }

    async getUserProfile(userId) {
        const user = await this.db.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async updateProfile(userId, updateData) {
        const allowedFields = ['name', 'email'];
        const filteredData = {};
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        }

        // Validate email if provided
        if (filteredData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(filteredData.email)) {
                throw new Error('Invalid email format');
            }

            // Check if email is already taken by another user
            const existingUser = await this.db.findUserByEmail(filteredData.email);
            if (existingUser && existingUser.id !== userId) {
                throw new Error('Email already taken');
            }
        }

        // Validate name if provided
        if (filteredData.name && filteredData.name.length < 2) {
            throw new Error('Name must be at least 2 characters');
        }

        return await this.db.updateUser(userId, filteredData);
    }

    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.db.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Validate current password
        const crypto = require('crypto');
        const hashedCurrentPassword = crypto.createHash('sha256').update(currentPassword).digest('hex');
        if (user.password !== hashedCurrentPassword) {
            throw new Error('Current password is incorrect');
        }

        // Validate new password
        if (newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters');
        }

        // Hash new password
        const hashedNewPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

        await this.db.updateUser(userId, { password: hashedNewPassword });
    }

    async deleteUser(userId) {
        // First delete all user sessions
        await this.db.deleteAllUserSessions(userId);
        
        // Then delete the user (this would need to be implemented in the database class)
        // For now, we'll use the original JSON database method
        const data = await database.readData();
        const userIndex = data.users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        // Remove user
        data.users.splice(userIndex, 1);
        
        await database.writeData(data);
    }

    async getAllUsers() {
        // Use the new MongoDB method if available, fallback to JSON
        try {
            return await this.db.getAllUsers();
        } catch {
            const data = await database.readData();
            return data.users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });
        }
    }
}

module.exports = new UserService();
