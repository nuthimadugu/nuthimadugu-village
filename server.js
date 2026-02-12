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
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuthimadugu_village',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Farmer@515001';

// ===== PREDEFINED SECURITY QUESTIONS =====
const SECURITY_QUESTIONS = [
    "What is your mother's maiden name?",
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your favorite food?",
    "What was your childhood nickname?",
    "What is your father's middle name?",
    "What is the name of your favorite teacher?",
    "What is your favorite color?",
    "What is the name of the street you grew up on?",
    "What is your favorite movie?"
];

// ===== MIDDLEWARE =====

// Authenticate JWT Token
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = jwt.verify(token, JWT_SECRET);
        const [users] = await pool.query(
            'SELECT id, name, email, mobile, role, status FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) return res.status(401).json({ error: 'User not found' });
        if (users[0].status === 'blocked') return res.status(403).json({ error: 'Account blocked by admin' });

        req.user = users[0];
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Admin Only
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ===== AUTH ENDPOINTS =====

// Get Available Security Questions
app.get('/api/security-questions', (req, res) => {
    res.json({ success: true, questions: SECURITY_QUESTIONS });
});

// Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, mobile, password, securityQuestions } = req.body;

        // Validation
        if (!name || !email || !mobile || !password || !securityQuestions) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
            return res.status(400).json({ error: 'Invalid mobile number (must be 10 digits)' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        // Validate security questions
        if (!securityQuestions.question1 || !securityQuestions.answer1 ||
            !securityQuestions.question2 || !securityQuestions.answer2 ||
            !securityQuestions.question3 || !securityQuestions.answer3) {
            return res.status(400).json({ error: 'All 3 security questions are required' });
        }

        // Check if email or mobile already exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ? OR mobile = ?',
            [email, mobile]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email or mobile already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await pool.query(
            'INSERT INTO users (name, email, mobile, password, status) VALUES (?, ?, ?, ?, ?)',
            [name, email, mobile, hashedPassword, 'active']
        );

        const userId = result.insertId;

        // Store security questions (hash answers for security)
        const hashedAnswer1 = await bcrypt.hash(securityQuestions.answer1.toLowerCase().trim(), 10);
        const hashedAnswer2 = await bcrypt.hash(securityQuestions.answer2.toLowerCase().trim(), 10);
        const hashedAnswer3 = await bcrypt.hash(securityQuestions.answer3.toLowerCase().trim(), 10);

        await pool.query(
            'INSERT INTO security_questions (user_id, question1, answer1, question2, answer2, question3, answer3) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, securityQuestions.question1, hashedAnswer1, securityQuestions.question2, hashedAnswer2, securityQuestions.question3, hashedAnswer3]
        );

        // Generate JWT token
        const token = jwt.sign({ userId: userId }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            message: 'Registration successful!',
            token: token,
            user: { id: userId, name, email, mobile, role: 'user' }
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        if (user.status === 'blocked') {
            return res.status(403).json({ 
                error: 'Your account has been blocked by admin.',
                reason: user.blocked_reason 
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Admin Login
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { password } = req.body;

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Invalid admin password' });
        }

        // Get or create admin user
        let [admins] = await pool.query('SELECT * FROM users WHERE role = ? LIMIT 1', ['admin']);
        
        if (admins.length === 0) {
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
            const [result] = await pool.query(
                'INSERT INTO users (name, email, mobile, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
                ['Admin', 'admin@nuthimadugu.in', '9999999999', hashedPassword, 'admin', 'active']
            );
            admins = [{ id: result.insertId, name: 'Admin', email: 'admin@nuthimadugu.in', mobile: '9999999999', role: 'admin' }];
        }

        const admin = admins[0];
        const token = jwt.sign({ userId: admin.id }, JWT_SECRET, { expiresIn: '12h' });

        res.json({
            success: true,
            token: token,
            user: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                mobile: admin.mobile,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Admin Login Error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Forgot Password: Get Security Questions
app.post('/api/auth/forgot-password/get-questions', async (req, res) => {
    try {
        const { email } = req.body;

        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Email not registered' });
        }

        const userId = users[0].id;

        // Get security questions
        const [questions] = await pool.query(
            'SELECT question1, question2, question3 FROM security_questions WHERE user_id = ?',
            [userId]
        );

        if (questions.length === 0) {
            return res.status(404).json({ error: 'Security questions not found' });
        }

        res.json({
            success: true,
            questions: {
                question1: questions[0].question1,
                question2: questions[0].question2,
                question3: questions[0].question3
            }
        });
    } catch (error) {
        console.error('Get Questions Error:', error);
        res.status(500).json({ error: 'Failed to retrieve questions' });
    }
});

// Forgot Password: Verify Answers and Reset Password
app.post('/api/auth/forgot-password/verify-reset', async (req, res) => {
    try {
        const { email, answers, newPassword } = req.body;

        if (!email || !answers || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Email not registered' });
        }

        const userId = users[0].id;

        // Get security questions and answers
        const [securityData] = await pool.query(
            'SELECT answer1, answer2, answer3 FROM security_questions WHERE user_id = ?',
            [userId]
        );

        if (securityData.length === 0) {
            return res.status(404).json({ error: 'Security questions not found' });
        }

        // Verify all 3 answers
        const answer1Match = await bcrypt.compare(answers.answer1.toLowerCase().trim(), securityData[0].answer1);
        const answer2Match = await bcrypt.compare(answers.answer2.toLowerCase().trim(), securityData[0].answer2);
        const answer3Match = await bcrypt.compare(answers.answer3.toLowerCase().trim(), securityData[0].answer3);

        if (!answer1Match || !answer2Match || !answer3Match) {
            return res.status(401).json({ error: 'Security answers do not match' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Password reset successful! You can now login with your new password.'
        });
    } catch (error) {
        console.error('Password Reset Error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// ===== USER MANAGEMENT (ADMIN) =====

// Get All Users
app.get('/api/admin/users', authenticate, adminOnly, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, mobile, status, role, created_at, last_login, blocked_reason FROM users ORDER BY created_at DESC'
        );
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Block User
app.post('/api/admin/users/:userId/block', authenticate, adminOnly, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        await pool.query(
            'UPDATE users SET status = ?, blocked_by = ?, blocked_reason = ?, blocked_at = NOW() WHERE id = ? AND role != ?',
            ['blocked', req.user.id, reason || 'Blocked by admin', userId, 'admin']
        );

        // Log activity
        await pool.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'BLOCK_USER', 'users', userId, reason]
        );

        res.json({ success: true, message: 'User blocked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to block user' });
    }
});

// Unblock User
app.post('/api/admin/users/:userId/unblock', authenticate, adminOnly, async (req, res) => {
    try {
        const { userId } = req.params;

        await pool.query(
            'UPDATE users SET status = ?, blocked_by = NULL, blocked_reason = NULL, blocked_at = NULL WHERE id = ?',
            ['active', userId]
        );

        await pool.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
            [req.user.id, 'UNBLOCK_USER', 'users', userId]
        );

        res.json({ success: true, message: 'User unblocked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unblock user' });
    }
});

// Delete User
app.delete('/api/admin/users/:userId', authenticate, adminOnly, async (req, res) => {
    try {
        const { userId } = req.params;
        await pool.query('DELETE FROM users WHERE id = ? AND role != ?', [userId, 'admin']);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ===== ANNOUNCEMENTS =====

// Get All Announcements
app.get('/api/announcements', async (req, res) => {
    try {
        const [announcements] = await pool.query(
            'SELECT a.*, u.name as posted_by_name FROM announcements a LEFT JOIN users u ON a.posted_by = u.id ORDER BY created_at DESC LIMIT 50'
        );
        res.json({ success: true, announcements });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// Post Announcement (Admin)
app.post('/api/announcements', authenticate, adminOnly, async (req, res) => {
    try {
        const { title, details, priority } = req.body;

        const [result] = await pool.query(
            'INSERT INTO announcements (title, details, priority, posted_by) VALUES (?, ?, ?, ?)',
            [title, details, priority || 'normal', req.user.id]
        );

        res.json({ success: true, id: result.insertId, message: 'Announcement posted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to post announcement' });
    }
});

// Delete Announcement
app.delete('/api/announcements/:id', authenticate, adminOnly, async (req, res) => {
    try {
        await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

// Get Institutions
app.get('/api/institutions', async (req, res) => {
    try {
        const [institutions] = await pool.query('SELECT * FROM institutions');
        res.json({ success: true, institutions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch institutions' });
    }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔒 Admin Password: ${ADMIN_PASSWORD}`);
    console.log(`✅ Security Questions Authentication Enabled`);
});