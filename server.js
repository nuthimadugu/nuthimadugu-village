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
app.use(express.static(path.join(__dirname, './')));

// *** CHANGE: Set port to 3000, a common default ***
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

// Routes
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: `Nuthimadugu Village API is live on Port ${PORT}!` 
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🔗 Public URL: https://nuthimadugu-village-production-01cd.up.railway.app/`);
});
