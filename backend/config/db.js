const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecoride';
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected');
        
        // Create default admin user if not exists
        await createDefaultAdmin();
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ email: 'admin@ecoride.com' });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Admin123', salt);
            
            const adminUser = new User({
                name: 'System Administrator',
                email: 'admin@ecoride.com',
                password: hashedPassword,
                role: 'admin'
            });
            
            await adminUser.save();
            console.log('Default admin user created: admin@ecoride.com');
        }
    } catch (err) {
        console.error('Error creating default admin:', err.message);
    }
};

module.exports = connectDB;
