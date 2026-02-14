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
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

const JWT_SECRET = process.env.JWT_SECRET || 'nuthimadugu_secret_2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Farmer@515001';

// --- DYNAMIC JOBS ---
app.get('/api/jobs', async (req, res) => {
    try {
        const jobAlerts = [
            { title: "AP Grama/Ward Sachivalayam 2026", source: "Official Govt", date: new Date().toLocaleDateString(), link: "https://gramawardsachivalayam.ap.gov.in/" },
            { title: "APPSC Group II Services", source: "PSC AP", date: "Feb 2026", link: "https://psc.ap.gov.in/" },
            { title: "AP Teacher Eligibility Test (TET)", source: "Education Dept", date: "Latest", link: "https://aptet.apcfss.in/" }
        ];
        res.json({ success: true, jobs: jobAlerts });
    } catch (error) { res.status(500).json({ success: false }); }
});

// --- ADMIN LOGIN (PASSWORD ONLY) ---
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

// --- USER AUTH ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, mobile, password, securityQuestions } = req.body;
        const hashedPw = await bcrypt.hash(password, 10);
        const [result] = await pool.query('INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)', [name, email, mobile, hashedPw]);
        const hA = [await bcrypt.hash(securityQuestions.answer1.toLowerCase(), 10), await bcrypt.hash(securityQuestions.answer2.toLowerCase(), 10), await bcrypt.hash(securityQuestions.answer3.toLowerCase(), 10)];
        await pool.query('INSERT INTO security_questions (user_id, question1, answer1, question2, answer2, question3, answer3) VALUES (?, ?, ?, ?, ?, ?, ?)', [result.insertId, securityQuestions.question1, hA[0], securityQuestions.question2, hA[1], securityQuestions.question3, hA[2]]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Registration failed" }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0 || !(await bcrypt.compare(password, users[0].password))) return res.status(401).json({ error: "Invalid Credentials" });
        const token = jwt.sign({ userId: users[0].id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, token, user: { name: users[0].name, role: users[0].role } });
    } catch (err) { res.status(500).json({ error: "Login error" }); }
});

app.get('/api/security-questions', (req, res) => {
    res.json({ success: true, questions: ["Mother's maiden name?", "First pet?", "Birth city?", "Favorite food?"] });
});

app.listen(process.env.PORT || 3000, () => console.log(`🚀 Server active`));
