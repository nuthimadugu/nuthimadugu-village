const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Database Connection
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'mysql.railway.internal',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'TvTDEemzDosefkZFvWjqnhTkeNDjzSnY',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || 'nuthimadugu_secret_2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Farmer@515001';

// --- JOB NOTIFICATIONS LOGIC ---
// This endpoint dynamically provides job alerts
app.get('/api/jobs', async (req, res) => {
    try {
        // In a production environment, you would scrape a site or use a Job API here.
        // For now, we provide dynamic data that can be updated via this array.
        const jobAlerts = [
            { 
                title: "AP Grama/Ward Sachivalayam Recruitment 2026", 
                source: "Official Govt Portal", 
                date: new Date().toLocaleDateString(), 
                link: "https://gramawardsachivalayam.ap.gov.in/" 
            },
            { 
                title: "APPSC Group II Services Notification", 
                source: "PSC AP", 
                date: "Updated Today", 
                link: "https://psc.ap.gov.in/" 
            },
            { 
                title: "Andhra Pradesh Teacher Eligibility Test (TET)", 
                source: "School Education Dept", 
                date: "Feb 2026", 
                link: "https://aptet.apcfss.in/" 
            }
        ];
        res.json({ success: true, jobs: jobAlerts });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch jobs" });
    }
});

// --- ADMIN LOGIN (PASSWORD ONLY) ---
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Invalid Admin Password' });
        }

        // Check/Create Admin User in DB
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
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// --- USER REGISTRATION ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, mobile, password, securityQuestions } = req.body;
        const hashedPw = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            'INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)',
            [name, email, mobile, hashedPw]
        );

        // Store hashed security answers
        const hA1 = await bcrypt.hash(securityQuestions.answer1.toLowerCase().trim(), 10);
        const hA2 = await bcrypt.hash(securityQuestions.answer2.toLowerCase().trim(), 10);
        const hA3 = await bcrypt.hash(securityQuestions.answer3.toLowerCase().trim(), 10);

        await pool.query(
            'INSERT INTO security_questions (user_id, question1, answer1, question2, answer2, question3, answer3) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [result.insertId, securityQuestions.question1, hA1, securityQuestions.question2, hA2, securityQuestions.question3, hA3]
        );

        res.json({ success: true, message: "User registered" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
});

// --- USER LOGIN ---
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

// --- MISC ---
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
