const { MongoClient, ObjectId } = require('mongodb');

class MongoDB {
    constructor() {
        this.client = null;
        this.db = null;
        // Use your MongoDB Atlas connection string from environment variables
        this.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/icrown_dental';
        this.dbName = process.env.DB_NAME || 'icrown_dental';
    }

    async connect() {
        try {
            // MongoDB Atlas connection options
            const options = {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000
            };
            
            this.client = new MongoClient(this.uri, options);
            await this.client.connect();
            this.db = this.client.db(this.dbName);
            console.log('Connected to MongoDB Atlas successfully');
            
            // Create indexes for better performance
            await this.createIndexes();
            
            return this.db;
        } catch (error) {
            console.error('MongoDB Atlas connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log('Disconnected from MongoDB');
        }
    }

    async createIndexes() {
        try {
            // Users indexes
            await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
            await this.db.collection('users').createIndex({ id: 1 });
            
            // Appointments indexes
            await this.db.collection('appointments').createIndex({ patientId: 1 });
            await this.db.collection('appointments').createIndex({ date: 1 });
            await this.db.collection('appointments').createIndex({ status: 1 });
            await this.db.collection('appointments').createIndex({ 
                patientId: 1, 
                date: 1 
            });
            
            // Sessions indexes
            await this.db.collection('sessions').createIndex({ sessionId: 1 }, { unique: true });
            await this.db.collection('sessions').createIndex({ userId: 1 });
            await this.db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
            
            console.log('Database indexes created successfully');
        } catch (error) {
            console.error('Error creating indexes:', error);
        }
    }

    // User Management
    async findUserByEmail(email) {
        const user = await this.db.collection('users').findOne({ email });
        return user;
    }

    async findUserById(id) {
        const user = await this.db.collection('users').findOne({ id });
        return user;
    }

    async findUserByMongoId(_id) {
        const user = await this.db.collection('users').findOne({ _id: new ObjectId(_id) });
        return user;
    }

    async createUser(userData) {
        // Check if email already exists
        const existingUser = await this.findUserByEmail(userData.email);
        if (existingUser) {
            throw new Error('Email already exists');
        }

        const newUser = {
            id: new ObjectId().toString(),
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await this.db.collection('users').insertOne(newUser);
        
        // Return user without password
        const { password, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }

    async updateUser(id, updateData) {
        const updateDoc = {
            $set: {
                ...updateData,
                updatedAt: new Date()
            }
        };

        const result = await this.db.collection('users').updateOne(
            { id }, 
            updateDoc
        );

        if (result.matchedCount === 0) {
            throw new Error('User not found');
        }

        const updatedUser = await this.findUserById(id);
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }

    async getAllUsers() {
        const users = await this.db.collection('users')
            .find({}, { projection: { password: 0 } })
            .toArray();
        return users;
    }

    // Session Management
    async createSession(sessionData) {
        const newSession = {
            sessionId: new ObjectId().toString(),
            ...sessionData,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        const result = await this.db.collection('sessions').insertOne(newSession);
        return newSession;
    }

    async findSession(sessionId) {
        const session = await this.db.collection('sessions').findOne({ sessionId });
        
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
        const result = await this.db.collection('sessions').deleteOne({ sessionId });
        return result.deletedCount > 0;
    }

    async deleteAllUserSessions(userId) {
        const result = await this.db.collection('sessions').deleteMany({ userId });
        return result.deletedCount;
    }

    // Appointment Management
    async createAppointment(appointmentData) {
        const newAppointment = {
            id: new ObjectId().toString(),
            ...appointmentData,
            status: 'scheduled',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await this.db.collection('appointments').insertOne(newAppointment);
        return newAppointment;
    }

    async findAppointmentById(id) {
        const appointment = await this.db.collection('appointments').findOne({ id });
        return appointment;
    }

    async findAppointmentsByPatientId(patientId) {
        const appointments = await this.db.collection('appointments')
            .find({ patientId })
            .sort({ date: 1 })
            .toArray();
        return appointments;
    }

    async findAppointmentsByDateRange(startDate, endDate) {
        const appointments = await this.db.collection('appointments')
            .find({
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            })
            .sort({ date: 1 })
            .toArray();
        return appointments;
    }

    async findAvailableSlots(date, serviceId) {
        // Get all appointments for the specific date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const appointments = await this.db.collection('appointments')
            .find({
                date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                },
                status: { $in: ['scheduled', 'confirmed'] }
            })
            .toArray();

        // Define time slots
        const allSlots = [
            '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
            '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
        ];

        // Get booked slots
        const bookedSlots = appointments.map(apt => apt.time);
        
        // Return available slots
        return allSlots.filter(slot => !bookedSlots.includes(slot));
    }

    async updateAppointment(id, updateData) {
        const updateDoc = {
            $set: {
                ...updateData,
                updatedAt: new Date()
            }
        };

        const result = await this.db.collection('appointments').updateOne(
            { id }, 
            updateDoc
        );

        if (result.matchedCount === 0) {
            throw new Error('Appointment not found');
        }

        return await this.findAppointmentById(id);
    }

    async deleteAppointment(id) {
        const result = await this.db.collection('appointments').deleteOne({ id });
        return result.deletedCount > 0;
    }

    async getAllAppointments() {
        const appointments = await this.db.collection('appointments')
            .find({})
            .sort({ date: 1 })
            .toArray();
        return appointments;
    }

    // Medical Records Management
    async createMedicalRecord(recordData) {
        const newRecord = {
            id: new ObjectId().toString(),
            ...recordData,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await this.db.collection('medicalRecords').insertOne(newRecord);
        return newRecord;
    }

    async findMedicalRecordsByPatientId(patientId) {
        const records = await this.db.collection('medicalRecords')
            .find({ patientId })
            .sort({ date: -1 })
            .toArray();
        return records;
    }

    async updateMedicalRecord(id, updateData) {
        const updateDoc = {
            $set: {
                ...updateData,
                updatedAt: new Date()
            }
        };

        const result = await this.db.collection('medicalRecords').updateOne(
            { id }, 
            updateDoc
        );

        if (result.matchedCount === 0) {
            throw new Error('Medical record not found');
        }

        return await this.db.collection('medicalRecords').findOne({ id });
    }

    // Settings Management
    async getSettings() {
        const settings = await this.db.collection('settings').findOne({});
        return settings || {};
    }

    async updateSettings(settingsData) {
        const updateDoc = {
            $set: {
                ...settingsData,
                updatedAt: new Date()
            }
        };

        const result = await this.db.collection('settings').updateOne(
            {}, 
            updateDoc,
            { upsert: true }
        );

        return await this.getSettings();
    }

    // Analytics and Reporting
    async getAppointmentStats(startDate, endDate) {
        const matchStage = {
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        const stats = await this.db.collection('appointments').aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        return stats;
    }

    async getPatientStats() {
        const totalPatients = await this.db.collection('users').countDocuments();
        const activePatients = await this.db.collection('appointments')
            .distinct('patientId', {
                date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
            });

        return {
            totalPatients,
            activePatients: activePatients.length
        };
    }
}

module.exports = MongoDB;
