const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(express.static('public')); 

// 🗄️ DATABASE CONNECTION
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'xxxxxxxxxxxx', // ⚠️ Put your MySQL password here!
    database: 'campus_db'
});

db.connect((err) => {
    if (err) console.error('Database connection failed:', err.stack);
    else console.log('Connected to MySQL Database securely!');
});

// 📧 EMAIL SETUP (NODEMAILER)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'xxxxxxxxxxxxxx@gmail.com', // ⚠️ Your Gmail
        pass: 'xxxx xxxx xxxx xxxx' // ⚠️ Your 16-letter App Password
    }
});

// 📸 IMAGE UPLOAD SETUP
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage }).array('photos', 10);

// ==========================================
// 👨‍🎓 STUDENT API ENDPOINTS
// ==========================================

app.post('/api/submit', (req, res) => {
    upload(req, res, (err) => {
        if (err) return res.status(500).send("Upload error");
        
        const { studentName, regNumber, studentEmail, category, description, lat, lng } = req.body;
        const images = req.files ? req.files.map(file => file.filename).join(',') : '';
        const trackingId = 'SRM-' + Math.floor(100000 + Math.random() * 900000); 

        const sql = `INSERT INTO complaints (studentName, trackingId, regNumber, studentEmail, category, description, images, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.query(sql, [studentName, trackingId, regNumber, studentEmail, category, description, images, lat || null, lng || null], (err) => {
            if (err) return res.status(500).send("Database error");
            
            if (studentEmail) {
                const mailOptions = {
                    from: 'SRM Ramapuram Helpdesk <mrundefinable7@gmail.com>',
                    to: studentEmail,
                    subject: `Ticket Received: ${trackingId} (${category})`,
                    html: `<h3>Hello ${studentName},</h3>
                           <p>We have received your report regarding <strong>${category}</strong>.</p>
                           <p>Your Tracking ID is: <strong style="color: #0056b3;">${trackingId}</strong></p>`
                };
                transporter.sendMail(mailOptions).catch(console.error); 
            }
            res.status(200).json({ message: "Success", trackingId: trackingId });
        });
    });
});

app.get('/api/active-issues', (req, res) => {
    db.query("SELECT id, category, description, upvotes, status FROM complaints WHERE status != 'Resolved' ORDER BY upvotes DESC LIMIT 5", (err, results) => {
        if (err) return res.status(500).send("Database error");
        res.json(results);
    });
});

app.post('/api/upvote/:id', (req, res) => {
    db.query("UPDATE complaints SET upvotes = upvotes + 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).send("Database error");
        res.status(200).send("Upvoted");
    });
});

app.get('/api/track/:id', (req, res) => {
    db.query("SELECT category, status FROM complaints WHERE trackingId = ?", [req.params.id], (err, results) => {
        if (err) return res.status(500).send("Database error");
        if (results.length === 0) return res.status(404).send("Not Found");
        res.json(results[0]);
    });
});

app.post('/api/feedback', (req, res) => {
    const { trackingId, rating, comment } = req.body;
    const sql = "UPDATE complaints SET feedbackRating = ?, feedbackComment = ? WHERE trackingId = ?";
    db.query(sql, [rating, comment, trackingId], (err, result) => {
        if (err) return res.status(500).send("Database error");
        res.status(200).send("Feedback Saved");
    });
});

// ==========================================
// 🛡️ ADMIN & WORKER ENDPOINTS
// ==========================================

// Get all complaints for the Admin Table
app.get('/api/complaints', (req, res) => {
    db.query("SELECT * FROM complaints ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).send("Database error");
        res.json(results);
    });
});

// Admin assigns a worker to a task
app.post('/api/update-assignee', (req, res) => {
    db.query("UPDATE complaints SET assignedTo = ? WHERE id = ?", [req.body.assignedTo, req.body.id], (err) => {
        if (err) return res.status(500).send("Database error");
        res.status(200).send("Updated");
    });
});

// Update status and worker notes
app.post('/api/update-status', (req, res) => {
    const { status, remarks, id } = req.body;
    const sql = remarks !== undefined 
        ? "UPDATE complaints SET status = ?, workerRemarks = ? WHERE id = ?" 
        : "UPDATE complaints SET status = ? WHERE id = ?";
    const params = remarks !== undefined ? [status, remarks, id] : [status, id];

    db.query(sql, params, (err) => {
        if (err) return res.status(500).send("Database error");
        res.status(200).send("Updated");
    });
});

// Get list of technicians for dropdowns
app.get('/api/technicians', (req, res) => {
    db.query("SELECT * FROM technicians", (err, results) => {
        if (err) return res.status(500).send("Database error");
        res.json(results);
    });
});

// ADD NEW TECHNICIAN
app.post('/api/add-technician', (req, res) => {
    const { name, username, password } = req.body;

    // Validation
    if (!name || !username || !password) {
        return res.status(400).send("All fields (name, username, password) are required.");
    }

    // Default department to avoid the 'Field department doesn't have a default value' error
    const defaultDept = "General Maintenance";

    const sql = "INSERT INTO technicians (name, username, password, department) VALUES (?, ?, ?, ?)";
    
    db.query(sql, [name, username, password, defaultDept], (err, result) => {
        if (err) {
            console.error("❌ SQL Error:", err);
            return res.status(500).send("Database error occurred while adding technician.");
        }
        
        console.log(`✅ Technician Created: ${name} | User: ${username}`);
        res.status(200).json({ message: "Technician successfully added." });
    });
});

// WORKER LOGIN
app.post('/api/worker-login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM technicians WHERE username = ? AND password = ?";
    
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).send("Database error");
        
        if (results.length > 0) {
            // THIS LINE IS CRITICAL: It sends the profile data to the button!
            res.status(200).json({ success: true, workerName: results[0].name, workerProfile: results[0] });
        } else {
            res.status(401).json({ success: false });
        }
    });
});
app.post('/api/worker-tasks', (req, res) => {
    const { workerName } = req.body;
    
    // ADD THIS LINE BELOW
    console.log(`🔍 Searching for tasks assigned to: "${workerName}"`);

    const sql = "SELECT * FROM complaints WHERE assignedTo = ?";
    db.query(sql, [workerName], (err, results) => {
        if (err) return res.status(500).send("Database error");
        res.status(200).json(results);
    });
});
// FETCH WORKER TASKS (Filter by assignedTo)
app.post('/api/worker-tasks', (req, res) => {
    const { workerName } = req.body;
    const sql = "SELECT * FROM complaints WHERE assignedTo = ? ORDER BY id DESC";
    db.query(sql, [workerName], (err, results) => {
        if (err) return res.status(500).send("Database error");
        res.json(results);
    });
});

// Route to handle Deleting a technician
app.post('/api/delete-technician', (req, res) => {
    const idToDelete = req.body.id;

    if (!idToDelete) {
        return res.status(400).send("ID is required");
    }

    db.query("DELETE FROM technicians WHERE id = ?", [idToDelete], (err, result) => {
        if (err) {
            console.error("❌ SQL Delete Error:", err);
            return res.status(500).send("Database error");
        }
        console.log(`✅ Technician with ID ${idToDelete} was deleted.`);
        res.status(200).send("Deleted");
    });
});

// Route to handle Editing a technician
app.post('/api/update-technician', (req, res) => {
    const { id, name, username, password } = req.body;
    
    db.query("UPDATE technicians SET name = ?, username = ?, password = ? WHERE id = ?", [name, username, password, id], (err) => {
        if (err) {
            console.error("❌ SQL Update Error:", err);
            return res.status(500).send("Database error");
        }
        console.log(`✅ Technician with ID ${id} was updated.`);
        res.status(200).send("Updated");
    });
});
// 🚀 START SERVER
app.listen(3000, () => {
    console.log('-----------------------------------------');
    console.log('🚀 Server running on http://localhost:3000');
    console.log('-----------------------------------------');
});