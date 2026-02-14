// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql.railway.internal',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'TvTDEemzDosefkZFvWjqnhTkeNDjzSnY',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const JWT_SECRET = process.env.JWT_SECRET || 'nuthimadugu_secret_99';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Farmer@515001';

const SECURITY_QUESTIONS = [
    "What is your mother's maiden name?",
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your favorite food?",
    "What was your childhood nickname?"
];

// ===== AUTH ENDPOINTS =====

// Get Security Questions
app.get('/api/security-questions', (req, res) => {
    res.json({ success: true, questions: SECURITY_QUESTIONS });
});

// Admin Login (Password Only Logic)
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { password } = req.body;

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Invalid admin password' });
        }

        // Check if admin user exists, if not create one automatically
        let [admins] = await pool.query('SELECT * FROM users WHERE role = ? LIMIT 1', ['admin']);
        
        if (admins.length === 0) {
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
            const [result] = await pool.query(
                'INSERT INTO users (name, email, mobile, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
                ['Admin', 'admin@nuthimadugu.in', '9999999999', hashedPassword, 'admin', 'active']
            );
            admins = [{ id: result.insertId, name: 'Admin', email: 'admin@nuthimadugu.in', role: 'admin' }];
        }

        const admin = admins[0];
        const token = jwt.sign({ userId: admin.id }, JWT_SECRET, { expiresIn: '12h' });

        res.json({
            success: true,
            token: token,
            user: { id: admin.id, name: admin.name, role: admin.role }
        });
    } catch (error) {
        console.error('Admin Login Error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, mobile, password, securityQuestions } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (name, email, mobile, password, status) VALUES (?, ?, ?, ?, ?)',
            [name, email, mobile, hashedPassword, 'active']
        );

        const userId = result.insertId;

        // Hash security answers
        const hA1 = await bcrypt.hash(securityQuestions.answer1.toLowerCase().trim(), 10);
        const hA2 = await bcrypt.hash(securityQuestions.answer2.toLowerCase().trim(), 10);
        const hA3 = await bcrypt.hash(securityQuestions.answer3.toLowerCase().trim(), 10);

        await pool.query(
            'INSERT INTO security_questions (user_id, question1, answer1, question2, answer2, question3, answer3) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, securityQuestions.question1, hA1, securityQuestions.question2, hA2, securityQuestions.question3, hA3]
        );

        const token = jwt.sign({ userId: userId }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, token, user: { id: userId, name, role: 'user' } });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = users[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// ===== DYNAMIC JOBS ENDPOINT =====
// In a real production app, you would use 'rss-parser' to fetch live data
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = [
            { 
                title: "AP Grama/Ward Sachivalayam Notifications 2026", 
                source: "AP Govt", 
                date: new Date().toLocaleDateString(), 
                link: "https://gramawardsachivalayam.ap.gov.in/" 
            },
            { 
                title: "APPSC Group 1 & 2 Fresh Vacancies", 
                source: "APPSC", 
                date: "Feb 2026", 
                link: "https://psc.ap.gov.in/" 
            },
            { 
                title: "District Selection Committee (DSC) Teacher Recruitment", 
                source: "Education Dept", 
                date: "Live Updates", 
                link: "https://apdsc.apcfss.in/" 
            }
        ];
        res.json({ success: true, jobs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

// Forgot Password Questions
app.post('/api/auth/forgot-password/get-questions', async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'Email not found' });

        const [q] = await pool.query('SELECT question1, question2, question3 FROM security_questions WHERE user_id = ?', [users[0].id]);
        res.json({ success: true, questions: q[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

// Verify and Reset
app.post('/api/auth/forgot-password/verify-reset', async (req, res) => {
    try {
        const { email, answers, newPassword } = req.body;
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        const [sq] = await pool.query('SELECT answer1, answer2, answer3 FROM security_questions WHERE user_id = ?', [users[0].id]);

        const a1 = await bcrypt.compare(answers.answer1.toLowerCase().trim(), sq[0].answer1);
        const a2 = await bcrypt.compare(answers.answer2.toLowerCase().trim(), sq[0].answer2);
        const a3 = await bcrypt.compare(answers.answer3.toLowerCase().trim(), sq[0].answer3);

        if (a1 && a2 && a3) {
            const hashedPw = await bcrypt.hash(newPassword, 10);
            await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPw, users[0].id]);
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Answers incorrect' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Reset failed' });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
