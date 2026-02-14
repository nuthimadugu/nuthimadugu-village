const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

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

// MANDATORY: Railway Health Check Endpoint
// This stops the "Stopping Container" logs by telling Railway the server is OK.
app.get('/', (req, res) => {
    res.status(200).send('<h1>🌾 Nuthimadugu Village Server is Live</h1>');
});

// --- DYNAMIC JOBS ENDPOINT ---
app.get('/api/jobs', async (req, res) => {
    const jobAlerts = [
        { title: "AP Grama Sachivalayam 2026", source: "Official Govt", date: "Feb 14", link: "https://gramawardsachivalayam.ap.gov.in/" },
        { title: "APPSC Group II Services", source: "PSC AP", date: "Feb 2026", link: "https://psc.ap.gov.in/" }
    ];
    res.json({ success: true, jobs: jobAlerts });
});

// --- ADMIN LOGIN (PASSWORD ONLY) ---
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        const ADMIN_PW = process.env.ADMIN_PASSWORD || 'Farmer@515001';
        if (password !== ADMIN_PW) return res.status(401).json({ error: 'Invalid Password' });

        let [admins] = await pool.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');
        if (admins.length === 0) {
            const hashedPw = await bcrypt.hash(ADMIN_PW, 10);
            await pool.query(
                'INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)',
                ['Admin', 'admin@nuthimadugu.in', '9999999999', hashedPw, 'admin']
            );
            [admins] = await pool.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');
        }

        const token = jwt.sign({ userId: admins[0].id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, token, user: { name: 'Admin', role: 'admin' } });
    } catch (err) { res.status(500).json({ error: 'Database Error' }); }
});

// IMPORTANT: Use process.env.PORT to allow Railway to assign the port
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server active on port ${PORT}`);
});
