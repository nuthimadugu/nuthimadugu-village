const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, './')));

// SETTING PORT TO 8080 TO MATCH YOUR RAILWAY PUBLIC URL SETTING
const PORT = process.env.PORT || 8080;

// Database Connection using your PUBLIC credentials
const db = mysql.createPool({
    host: 'shinkansen.proxy.rlwy.net', 
    user: 'root',
    password: 'TvTDEemzDosefkZFvWjqnhTkeNDjzSnY',
    database: 'railway',
    port: 22505,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000 
});

// Test Connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed: ' + err.message);
    } else {
        console.log('✅ Database connected successfully via Public Proxy!');
        connection.release();
    }
});

// --- API ROUTES ---

// 1. Health Check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Nuthimadugu Village API is live on Port 8080!' 
    });
});

// 2. Default route to serve your HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is active on port ${PORT}`);
    console.log(`🔗 URL: https://nuthimadugu-village-production-e8a6.up.railway.app/`);
});
