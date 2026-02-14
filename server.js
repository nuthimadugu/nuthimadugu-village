const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); // Using bcryptjs to prevent MODULE_NOT_FOUND errors
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Database Connection using your Railway Variables
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

// --- 1. DYNAMIC JOB NOTIFICATIONS ---
app.get('/api/jobs', async (req, res) => {
    try {
        // These are dynamic and can be updated here to reflect live AP job news
        const jobAlerts = [
            { 
                title: "AP Grama/Ward Sachivalayam Recruitment 2026", 
                source: "Official Govt Portal", 
                date: new Date().toLocaleDateString(), 
                link: "https://gramawardsachivalayam.ap.gov.in/" 
            },
            { 
                title: "APPSC Group II Services - Fresh Vacancies", 
                source: "PSC AP", 
                date: "Update: Feb 2026", 
                link: "https://psc.ap.gov.in/" 
            },
            { 
                title: "AP Teacher Eligibility Test (TET) Notification", 
                source: "School Education Dept", 
                date: "Latest", 
                link: "https://aptet.apcfss.in/" 
            }
        ];
        res.json({ success: true, jobs: jobAlerts });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch jobs" });
    }
});

// --- 2. ADMIN LOGIN (PASSWORD ONLY) ---
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Invalid Admin Password' });
        }

        // Check if Admin exists in your empty 'users' table
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// --- 3. USER REGISTRATION ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, mobile, password, securityQuestions } = req.body;
        const hashedPw = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            'INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)',
            [name, email, mobile, hashedPw]
        );

        const hA1 = await bcrypt.hash(securityQuestions.answer1.toLowerCase().trim(), 10);
        const hA2 = await bcrypt.hash(securityQuestions.answer2.toLowerCase().trim(), 10);
        const hA3 = await bcrypt.hash(securityQuestions.answer3.toLowerCase().trim(), 10);

        await pool.query(
            'INSERT INTO security_questions (user_id, question1, answer1, question2, answer2, question3, answer3) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [result.insertId, securityQuestions.question1, hA1, securityQuestions.question2, hA2, securityQuestions.question3, hA3]
        );

        res.json({ success: true, message: "User registered" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed. Email or mobile might exist." });
    }
});

// --- 4. USER LOGIN ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: "Invalid email" });

        const valid = await bcrypt.compare(password, users[0].password);
        if (!valid) return res.status(401).json({ error: "Invalid password" });

        const token = jwt.sign({ userId: users[0].id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, token, user: { name: users[0].name, role: users[0].role } });
    } catch (err) {
        res.status(500).json({ error: "Login error" });
    }
});

// --- 5. SECURITY QUESTIONS ---
app.get('/api/security-questions', (req, res) => {
    res.json({ 
        success: true, 
        questions: [
            "What is your mother's maiden name?",
            "What was the name of your first pet?",
            "What city were you born in?",
            "What is your favorite food?"
        ] 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server active on port ${PORT}`));
