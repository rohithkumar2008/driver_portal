require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const uri = process.env.MONGO_URI;

mongoose.connect(uri).then(() => {
    console.log("SUCCESS!");
    process.exit(0);
}).catch(err => {
    console.error("FAILED:", err);
    process.exit(1);
});
