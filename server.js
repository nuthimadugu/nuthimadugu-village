const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Database Pool using Railway Variables
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

// --- DYNAMIC JOBS ---
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
        if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid Password' });

        let [admins] = await pool.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');
        
        // Auto-seed admin if the table is empty
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
    } catch (err) { res.status(500).json({ error: 'Database Error' }); }
});

// --- SECURITY QUESTIONS ---
app.get('/api/security-questions', (req, res) => {
    res.json({ success: true, questions: ["Mother's maiden name?", "First pet?", "Birth city?"] });
});

// --- OTHER AUTH ENDPOINTS (Login/Register) ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length > 0 && await bcrypt.compare(password, users[0].password)) {
        const token = jwt.sign({ userId: users[0].id }, JWT_SECRET);
        return res.json({ success: true, token, user: { name: users[0].name, role: users[0].role } });
    }
    res.status(401).json({ error: "Invalid login" });
});

app.listen(process.env.PORT || 3000, () => console.log(`🚀 Server active`));
