const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const localUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/driver_portal';
        await mongoose.connect(localUri);
        console.log('✅ Successfully connected to MongoDB: Local Database (localhost:27017)');
    } catch (localError) {
        console.error('❌ Could not connect to Local MongoDB.');
        console.error('   Make sure MongoDB is installed and running on your computer on port 27017.');
    }
};

module.exports = connectDB;
