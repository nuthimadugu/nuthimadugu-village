const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs'); // Assuming you use bcrypt for passwords
const jwt = require('jsonwebtoken'); // Assuming you use JWT for authentication
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON request bodies

// Serve static files from the root directory (e.g., index.html, CSS, JS)
app.use(express.static(path.join(__dirname, './')));

// CRITICAL: Set the port for your application.
// Railway dynamically assigns a port via process.env.PORT.
// We fallback to 8080, matching your Railway's public networking setting.
const PORT = process.env.PORT || 8080;

// Database Connection using your PUBLIC proxy credentials
const db = mysql.createPool({
    host: 'shinkansen.proxy.rlwy.net', 
    user: 'root',
    password: 'TvTDEemzDosefkZFvWjqnhTkeNDjzSnY', // Your database password
    database: 'railway', // Your database name
    port: 22505, // The public port for the database proxy
    waitForConnections: true,
    connectionLimit: 10, // Adjust as needed
    queueLimit: 0,
    connectTimeout: 20000 // Increased timeout for public connections
});

// Test the database connection immediately upon server start
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed: ' + err.message);
    } else {
        console.log('✅ Database connected successfully via Public Proxy!');
        connection.release(); // Release the connection back to the pool
    }
});

// --- API ROUTES ---

// 1. Health Check Route
// This is a simple endpoint to verify if the server is running and accessible.
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: `Nuthimadugu Village API is live on Port ${PORT}!` 
    });
});

// 2. Default Route to Serve Your Frontend
// This route will serve your index.html file when the root URL is accessed.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Add any other API routes here (e.g., for user registration, data fetching)
// Example:
// app.post('/api/register', async (req, res) => { /* ... registration logic ... */ });
// app.get('/api/villages', (req, res) => { /* ... fetch village data ... */ });


// Start the Server
// The '0.0.0.0' allows the server to be accessible from any network interface.
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🔗 Public URL: https://nuthimadugu-village-production-01cd.up.railway.app/`);
});
