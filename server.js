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

// CRITICAL: Railway uses process.env.PORT. Do not hardcode 3000 or 8080.
const PORT = process.env.PORT || 3000;

// Database Connection
const db = mysql.createPool({
    host: 'shinkansen.proxy.rlwy.net', 
    user: 'root',
    password: 'TvTDEemzDosefkZFvWjqnhTkeNDjzSnY',
    database: 'railway',
    port: 22505,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed: ' + err.message);
    } else {
        console.log('✅ Database connected successfully!');
        connection.release();
    }
});

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Nuthimadugu Village API is live!' });
});

// Default route to serve your HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
