const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Explicit CORS to prevent connection errors
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
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

// REQUIRED: Health Check for Railway Stability
app.get('/', (req, res) => res.status(200).send('Nuthimadugu Server Active'));

// --- 1. DONATIONS ENDPOINT ---
// Pulls latest data from fund_collections table
app.get('/api/donations', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT donor_name, purpose, amount FROM fund_collections ORDER BY created_at DESC LIMIT 10');
        res.json({ success: true, donations: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// --- 2. GALLERY ENDPOINT ---
app.get('/api/gallery', async (req, res) => {
    // These link to your village institutions
    const images = [
        { title: "Sri Venkateswara Temple", url: "https://via.placeholder.com/400x300?text=Temple", desc: "🕉️ Religious Center" },
        { title: "ZP High School", url: "https://via.placeholder.com/400x300?text=School", desc: "🏫 Education" },
        { title: "Gram Panchayat Office", url: "https://via.placeholder.com/400x300?text=Panchayat", desc: "🏛️ Administration" }
    ];
    res.json({ success: true, images });
});

// --- 3. DYNAMIC JOBS ENDPOINT ---
app.get('/api/jobs', async (req, res) => {
    const jobAlerts = [
        { title: "AP Grama Sachivalayam 2026", source: "Official Govt", date: "Feb 14", link: "https://gramawardsachivalayam.ap.gov.in/" },
        { title: "APPSC Group II Services", source: "PSC AP", date: "Feb 12", link: "https://psc.ap.gov.in/" }
    ];
    res.json({ success: true, jobs: jobAlerts });
});

// --- 4. ADMIN LOGIN (PASSWORD ONLY) ---
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid Password' });

        let [admins] = await pool.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');
        
        // Auto-seed admin if the users table is empty
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

// --- 5. USER LOGIN ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0 || !(await bcrypt.compare(password, users[0].password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: users[0].id }, JWT_SECRET);
        res.json({ success: true, token, user: { name: users[0].name, role: users[0].role } });
    } catch (err) { res.status(500).json({ error: "Login error" }); }
});

// Start server on Port 8080 as required by Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server active on port ${PORT}`));
