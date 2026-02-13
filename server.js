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

// Serve static files (your index.html and others) from the root folder
app.use(express.static(path.join(__dirname, './')));

// Railway Port - Do NOT change this to 3000. 
// Railway needs process.env.PORT to make your URL work.
const PORT = process.env.PORT || 8080;

// Database Connection using your DIRECT values
const db = mysql.createPool({
    host: 'mysql.railway.internal', // Internal host for Railway
    user: 'root',
    password: 'TvTDEemzDosefkZFvWjqnhTkeNDjzSnY',
    database: 'railway',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection immediately
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed Error: ' + err.message);
    } else {
        console.log('✅ Connected to Railway MySQL Database Successfully!');
        connection.release();
    }
});

// --- ROUTES ---

// 1. Health Check (Test if the server is alive)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        database: 'Connected',
        message: 'Nuthimadugu Village API is running!' 
    });
});

// 2. Serve your frontend (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. Example API Route (Replace 'users' with a table from your database_schema.sql)
app.get('/api/test-db', (req, res) => {
    db.query('SELECT 1 + 1 AS solution', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Database query successful', data: results });
    });
});

// Start the Server
app.listen(PORT, () => {
    console.log(`🚀 Server is live on port ${PORT}`);
    console.log(`🔗 Access it at: https://nuthimadugu-village-production.up.railway.app/`);
});
