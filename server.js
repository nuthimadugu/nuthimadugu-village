require('dotenv').config();
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

// Serve static files (index.html) from the root directory
app.use(express.static(path.join(__dirname, './')));

// Railway assigned Port or 8080
const PORT = process.env.PORT || 8080;

// Database Connection using your Railway Variables
const db = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Database Connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Connected to Railway MySQL Database');
        connection.release();
    }
});

// Health Check Route
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        database: 'Connected',
        message: 'Nuthimadugu Village API is live!' 
    });
});

// Basic Route to serve your index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- YOUR API ROUTES START HERE ---

// Example: Get all data from a table (replace 'your_table' with your actual table name)
app.get('/api/data', (req, res) => {
    db.query('SELECT * FROM your_table_name', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- YOUR API ROUTES END HERE ---

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
