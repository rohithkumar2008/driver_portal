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
        const newDriver = new Driver(req.body);
        const savedDriver = await newDriver.save();
        res.status(201).json({ success: true, message: 'Driver registered successfully', data: savedDriver });
    } catch (error) {
        console.error('Error saving driver:', error);
        res.status(500).json({ success: false, message: 'Failed to register driver', error: error.message });
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`🌐 To access from other devices on your Wi-Fi:`);
    console.log(`   Type 'ipconfig' in terminal, find IPv4 Address (e.g., 192.168.x.x)`);
    console.log(`   Then open: http://<your-ipv4>:${PORT}`);
});
