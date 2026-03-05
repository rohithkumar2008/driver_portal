const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Fix DNS resolution for MongoDB Atlas (bypasses network DNS restrictions)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
    // ✅ STEP 1: Try to connect to MongoDB Atlas first
    if (process.env.MONGO_URI) {
        try {
            await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
            console.log('✅ Successfully connected to MongoDB: Atlas Cloud');
            return;
        } catch (atlasError) {
            console.warn('⚠️  Could not connect to Atlas. Trying local MongoDB...');
            console.warn('   Reason:', atlasError.message.split('\n')[0]);
        }
    }

    // ✅ STEP 2: Fallback to Local MongoDB automatically
    try {
        const localUri = 'mongodb://127.0.0.1:27017/driver_portal';
        await mongoose.connect(localUri);
        console.log('✅ Successfully connected to MongoDB: Local Database (localhost:27017)');
        console.log('   ⚠️  To use Atlas, whitelist your IP at: https://cloud.mongodb.com → Security → Network Access');
    } catch (localError) {
        console.error('❌ Could not connect to Local MongoDB either.');
        console.error('   Make sure MongoDB is installed and running on your computer.');
        console.error('   OR whitelist your IP on MongoDB Atlas.');
        // Don't exit — let server keep running so API returns clear error messages
    }
};

module.exports = connectDB;
