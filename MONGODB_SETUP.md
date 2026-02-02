# MongoDB Setup Guide for iCrown Dental Clinic

## 🌟 You're Using MongoDB Atlas!

Perfect! You have a MongoDB Atlas cloud database. Here's how to complete the setup:

## � Step 1: Secure Your Database Password

**⚠️ IMPORTANT**: Never hardcode your database password in the code!

1. **Create .env file:**
   ```bash
   # In your project root directory
   cd "c:\Users\loren\Documents\xampp\htdocs\electron-app"
   copy .env.example .env
   ```

2. **Edit .env file** and replace `YOUR_ACTUAL_PASSWORD` with your real database password:
   ```
   MONGODB_URI=mongodb+srv://prepotentelorenze_db_user:YOUR_REAL_PASSWORD@cluster0.wp8gt4u.mongodb.net/?appName=Cluster0
   DB_NAME=icrown_dental
   ```

## 📦 Step 2: Install MongoDB Driver

Open **Command Prompt as Administrator** and run:

```bash
cd "c:\Users\loren\Documents\xampp\htdocs\electron-app"
npm install mongodb dotenv
```

## 🔧 Step 3: Load Environment Variables

Let me update the main.js to load environment variables...

The app will automatically:
1. ✅ Try to connect to MongoDB first
2. ✅ Create the `icrown_dental` database if it doesn't exist
3. ✅ Set up collections for users, appointments, medical records
4. ✅ Create database indexes for performance
5. ✅ Fallback to JSON database if MongoDB is unavailable

## 📊 MongoDB Collections

The app will create these collections automatically:

### `users`
```json
{
  "_id": ObjectId("..."),
  "id": "1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "hashed_password",
  "role": "customer",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### `appointments`
```json
{
  "_id": ObjectId("..."),
  "id": "1234567891",
  "patientId": "1234567890",
  "service": "cleaning",
  "date": "2024-01-15T09:00:00.000Z",
  "time": "09:00 AM",
  "status": "scheduled",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### `sessions`
```json
{
  "_id": ObjectId("..."),
  "sessionId": "abc123...",
  "userId": "1234567890",
  "userAgent": "Electron App",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "expiresAt": "2024-01-02T00:00:00.000Z"
}
```

### `medicalRecords`
```json
{
  "_id": ObjectId("..."),
  "id": "1234567892",
  "patientId": "1234567890",
  "diagnosis": "Regular checkup needed",
  "treatment": "Cleaning performed",
  "notes": "Patient oral health is good",
  "date": "2024-01-15T00:00:00.000Z",
  "createdAt": "2024-01-15T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

### `settings`
```json
{
  "_id": ObjectId("..."),
  "clinicName": "iCrown Dental Clinic",
  "workingHours": "9:00 AM - 6:00 PM",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 🔍 Database Indexes

The app automatically creates these indexes for optimal performance:

```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ id: 1 })

// Appointments collection
db.appointments.createIndex({ patientId: 1 })
db.appointments.createIndex({ date: 1 })
db.appointments.createIndex({ status: 1 })
db.appointments.createIndex({ patientId: 1, date: 1 })

// Sessions collection
db.sessions.createIndex({ sessionId: 1 }, { unique: true })
db.sessions.createIndex({ userId: 1 })
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

## 🛠️ Troubleshooting

### MongoDB Connection Issues
If the app can't connect to MongoDB:

1. **Check MongoDB Service:**
   ```bash
   # Windows
   net start MongoDB
   
   # Or restart
   net stop MongoDB
   net start MongoDB
   ```

2. **Verify Connection String:**
   - Default: `mongodb://localhost:27017`
   - Your app uses this exact connection

3. **Check MongoDB Compass:**
   - Make sure you can connect in Compass
   - Note the connection string if different

### Fallback Mode
If MongoDB isn't available, the app automatically falls back to JSON file storage:
- **Location**: `backend/data/database.json`
- **Same API** as MongoDB
- **Seamless switching**

## 🚀 Production Deployment

For production, consider:

1. **MongoDB Atlas** (Cloud-based)
   - Free tier available
   - Automatic backups
   - Global CDN

2. **Security**
   - Enable authentication
   - Use environment variables for connection string
   - Enable SSL/TLS

3. **Performance**
   - Monitor query performance
   - Optimize indexes
   - Consider read replicas for scaling

## 📞 Support

If you encounter issues:

1. Check the **Console** in the Electron app for connection status
2. Verify **MongoDB Compass** can connect
3. Check **Windows Services** that MongoDB is running
4. Review the **logs** in the app directory

The app will tell you exactly which database it's using on startup!
