const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Explicit CORS configuration to allow your GitHub site
app.use(cors({
    origin: '*', // Allows all origins to prevent connection errors during setup
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Database Pool using your Railway Variables
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql.railway.internal',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'TvTDEemzDosefkZFvWjqnhTkeNDjzSnY',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || 'nuthimadugu_secret_2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Farmer@515001';

// REQUIRED: Root endpoint for Railway Health Check
app.get('/', (req, res) => res.status(200).send('Village Server is Active'));

// --- DYNAMIC JOBS ---
app.get('/api/jobs', async (req, res) => {
    const jobAlerts = [
        { title: "AP Grama Sachivalayam 2026", source: "Official Govt", date: "Feb 14", link: "https://gramawardsachivalayam.ap.gov.in/" },
        { title: "APPSC Group II Services", source: "PSC AP", date: "Feb 2026", link: "https://psc.ap.gov.in/" }
    ];
    res.json({ success: true, jobs: jobAlerts });
});

// --- VILLAGE GALLERY ---
app.get('/api/gallery', async (req, res) => {
    const images = [
        { title: "Sri Venkateswara Temple", url: "https://via.placeholder.com/400x300?text=Temple", desc: "6AM-12PM, 4PM-8PM" },
        { title: "ZP High School", url: "https://via.placeholder.com/400x300?text=School", desc: "9AM-4PM" }
    ];
    res.json({ success: true, images });
});

// --- ADMIN LOGIN ---
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid Password' });

        let [admins] = await pool.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');
        
        if (admins.length === 0) {
            const hashedPw = await bcrypt.hash(ADMIN_PASSWORD, 10);
            await pool.query(
                'INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)',
                ['Admin', 'admin@nuthimadugu.in', '9999999999', hashedPw, 'admin']
            );
            [admins] = await pool.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');
        }

        const token = jwt.sign({ userId: admins[0].id, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, token, user: { name: 'Admin', role: 'admin' } });
    } catch (err) { res.status(500).json({ error: 'DB Connection Error' }); }
});

// Start server on Port 8080
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server active on port ${PORT}`));
