const express = require('express');
const connectDB = require('./db.js');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // Increased limit for base64 photos
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const path = require('path');

// ✅ Serve frontend files (index.html, script.js, style.css) from the same directory
app.use(express.static(__dirname));

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); // 32 bytes for aes-256-cbc
const IV_LENGTH = 16; // For AES, this is always 16

// Helper to encrypt text
function encrypt(text) {
    if (!text) return text;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text.toString());
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Helper to decrypt text
function decrypt(text) {
    if (!text) return text;
    try {
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.error('Decryption failed:', e.message);
        return null; // Return null or 'Decryption Failed' if data is corrupt or key changed
    }
}

// Define Driver Schema
const driverSchema = new mongoose.Schema({
    driver_name: { type: String, required: true },
    driver_age: { type: Number, required: true },
    mobile_number: { type: String, required: true },
    license_number: { type: String, required: true },
    vehicle_number: { type: String, required: true },
    vehicle_type: { type: String, required: true },
    vehicle_model: { type: String, default: 'Not specified' },
    photo: { type: String, default: null },  // Base64 encoded photo
    created_at: { type: Date, default: Date.now }
});

const Driver = mongoose.model('Driver', driverSchema);

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'Backend is running!' });
});

// Register a new driver
app.post('/api/drivers', async (req, res) => {
    try {
        const encryptedBody = {
            ...req.body,
            driver_name: encrypt(req.body.driver_name),
            mobile_number: encrypt(req.body.mobile_number),
            license_number: encrypt(req.body.license_number),
            vehicle_number: encrypt(req.body.vehicle_number),
            // Optionally encrypt photo as well, but it might be large. Let's keep it unencrypted to save performance, or encrypt if high security.
            // photo: encrypt(req.body.photo) 
        };
        const newDriver = new Driver(encryptedBody);
        const savedDriver = await newDriver.save();
        res.status(201).json({ success: true, message: 'Driver registered successfully', data: { _id: savedDriver._id } }); // Only return ID to client
    } catch (error) {
        console.error('Error saving driver:', error);
        res.status(500).json({ success: false, message: 'Failed to register driver', error: error.message });
    }
});

// Fetch a single driver for verification (Decrypts data)
app.get('/api/drivers/:id', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }

        const decryptedDriver = {
            ...driver.toObject(),
            driver_name: decrypt(driver.driver_name),
            mobile_number: decrypt(driver.mobile_number),
            license_number: decrypt(driver.license_number),
            vehicle_number: decrypt(driver.vehicle_number),
        };

        res.status(200).json({ success: true, data: decryptedDriver });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to verify driver', error: error.message });
    }
});

// Get all registered drivers (Useful for admin)
app.get('/api/drivers', async (req, res) => {
    try {
        const drivers = await Driver.find().sort({ created_at: -1 });
        res.status(200).json({ success: true, data: drivers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch drivers', error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
