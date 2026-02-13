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

// Serve static files
app.use(express.static(path.join(__dirname, './')));

// Railway Port
const PORT = process.env.PORT || 8080;

// Using your PUBLIC credentials to bypass "ENOTFOUND"
const db = mysql.createPool({
    host: 'shinkansen.proxy.rlwy.net', 
    user: 'root',
    password: 'TvTDEemzDosefkZFvWjqnhTkeNDjzSnY',
    database: 'railway',
    port: 22505, // Using the Public Port you provided
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000 // Higher timeout for public connection
});

// Test the connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed Error: ' + err.message);
    } else {
        console.log('✅ Connected to Railway MySQL Database via Public Proxy!');
        connection.release();
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Nuthimadugu Village API is running!' 
    });
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server is live on port ${PORT}`);
});
