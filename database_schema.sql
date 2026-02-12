-- database_schema.sql
CREATE DATABASE IF NOT EXISTS nuthimadugu_village;
USE nuthimadugu_village;

-- Users Table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile VARCHAR(10) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    status ENUM('active', 'blocked') DEFAULT 'active',
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    blocked_by INT NULL,
    blocked_reason TEXT NULL,
    blocked_at TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_mobile (mobile),
    INDEX idx_status (status),
    FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Security Questions Table
CREATE TABLE security_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    question1 VARCHAR(255) NOT NULL,
    answer1 VARCHAR(255) NOT NULL,
    question2 VARCHAR(255) NOT NULL,
    answer2 VARCHAR(255) NOT NULL,
    question3 VARCHAR(255) NOT NULL,
    answer3 VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id)
);

-- Announcements Table
CREATE TABLE announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    details TEXT NOT NULL,
    priority ENUM('normal', 'important', 'urgent') DEFAULT 'normal',
    posted_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Funds Collections Table
CREATE TABLE fund_collections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donor_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    purpose ENUM('development', 'festival', 'temple', 'education', 'health', 'other') NOT NULL,
    mobile VARCHAR(10),
    email VARCHAR(100),
    receipt_number VARCHAR(50) UNIQUE,
    added_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id)
);

-- Fund Expenses Table
CREATE TABLE fund_expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    description VARCHAR(200) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category ENUM('development', 'festival', 'temple', 'education', 'health', 'other') NOT NULL,
    bill_number VARCHAR(50),
    added_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id)
);

-- Events Table
CREATE TABLE events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(10),
    event_date DATE NOT NULL,
    event_time TIME,
    location VARCHAR(200),
    description TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Jobs Table
CREATE TABLE job_notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    organization VARCHAR(200) NOT NULL,
    vacancies VARCHAR(50),
    last_date DATE NOT NULL,
    qualification TEXT,
    application_link VARCHAR(500) NOT NULL,
    posted_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES users(id)
);

-- Chat Messages Table
CREATE TABLE chat_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Institutions Table
CREATE TABLE institutions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    icon VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    hours VARCHAR(100),
    address TEXT,
    status ENUM('open', 'closed') DEFAULT 'open',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Activity Logs Table
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert Default Institutions
INSERT INTO institutions (code, name, icon, phone, hours, status) VALUES
('panchayat', 'Gram Panchayat Office', '🏛️', '08559-245001', 'Mon-Sat 10AM-5PM', 'open'),
('phc', 'Primary Health Center', '🏥', '08559-245200', '24x7 Emergency', 'open'),
('school', 'ZP High School', '🏫', '08559-245102', 'Mon-Sat 9AM-4PM', 'open'),
('bank', 'Andhra Pradesh Grameena Bank', '🏦', '08559-245300', 'Mon-Fri 10AM-4PM, Sat 10AM-1PM', 'open'),
('postoffice', 'Post Office', '📮', '08559-245050', 'Mon-Sat 10AM-5PM', 'open'),
('temple', 'Sri Venkateswara Temple', '🕉️', 'N/A', 'Daily 6AM-12PM, 4PM-8PM', 'open'),
('market', 'Weekly Market Yard', '🛒', 'N/A', 'Monday 6AM-2PM', 'open');