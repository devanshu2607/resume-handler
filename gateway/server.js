const express = require('express');
const session = require('express-session');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const QUARKUS_URL = process.env.QUARKUS_URL || 'http://localhost:8082';
const dbFile = path.join(__dirname, 'resumes.json');

app.use(cors({
    origin: function (origin, callback) {
        // Allow all origins dynamically (localhost, Vercel, etc.)
        callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// Tag all responses to prove BFF architecture is active
app.use((req, res, next) => {
    res.setHeader('X-Powered-By-BFF', 'NodeJS-Express-Gateway');
    next();
});

app.set('trust proxy', 1); // trust Nginx proxy for secure cookies

app.use(session({
    secret: 'portal-super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        sameSite: 'none',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

const loadDb = () => {
    try {
        if (!fs.existsSync(dbFile)) {
            fs.writeFileSync(dbFile, '{}');
            return {};
        }
        return JSON.parse(fs.readFileSync(dbFile, 'utf8') || '{}');
    } catch {
        return {};
    }
};

const saveDb = (data) => {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
};

const auth = (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }
    next();
};

const verified = (req, res, next) => {
    if (!req.session.user.emailValidated) {
        return res.status(403).json({ message: 'You need to validate your email to access the portal' });
    }
    next();
};

app.post('/api/signup', async (req, res) => {
    try {
        const response = await axios.post(`${QUARKUS_URL}/users/signup`, req.body);
        res.status(response.status).json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { message: 'Signup failed' });
    }
});

app.post('/api/verify', async (req, res) => {
    try {
        const response = await axios.post(`${QUARKUS_URL}/users/verify`, req.body);
        if (req.session?.user) {
            req.session.user.emailValidated = true;
        }
        res.status(response.status).json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { message: 'Verification failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const response = await axios.post(`${QUARKUS_URL}/users/login`, req.body);
        req.session.user = response.data;
        res.json({ success: true, user: response.data });
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { message: 'Login failed' });
    }
});

app.post('/api/logout', auth, (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/session', (req, res) => {
    res.json({
        loggedIn: !!req.session?.user,
        user: req.session?.user || null
    });
});

app.get('/api/resumes/my', auth, verified, (req, res) => {
    const userId = req.session.user.id.toString();
    const db = loadDb();
    if (!db[userId]) {
        return res.status(404).json({ message: 'Resume not found' });
    }
    res.json(db[userId]);
});

app.post('/api/resumes', auth, verified, (req, res) => {
    const userId = req.session.user.id.toString();
    const db = loadDb();
    if (db[userId]) {
        return res.status(400).json({ message: 'Resume already exists' });
    }
    
    const { fullName, title, phone, summary, experience, education, skills } = req.body;
    if (!fullName) {
        return res.status(400).json({ message: 'Full name is required' });
    }

    const resume = {
        userId: req.session.user.id,
        fullName,
        title: title || '',
        phone: phone || '',
        summary: summary || '',
        experience: experience || '',
        education: education || '',
        skills: skills || ''
    };
    db[userId] = resume;
    saveDb(db);
    res.status(201).json(resume);
});

app.put('/api/resumes/my', auth, verified, (req, res) => {
    const userId = req.session.user.id.toString();
    const db = loadDb();
    if (!db[userId]) {
        return res.status(404).json({ message: 'Resume not found' });
    }

    const { fullName, title, phone, summary, experience, education, skills } = req.body;
    if (!fullName) {
        return res.status(400).json({ message: 'Full name is required' });
    }

    const updated = {
        ...db[userId],
        fullName,
        title: title || '',
        phone: phone || '',
        summary: summary || '',
        experience: experience || '',
        education: education || '',
        skills: skills || ''
    };
    db[userId] = updated;
    saveDb(db);
    res.json(updated);
});

app.delete('/api/resumes/my', auth, verified, (req, res) => {
    const userId = req.session.user.id.toString();
    const db = loadDb();
    if (!db[userId]) {
        return res.status(404).json({ message: 'Resume not found' });
    }
    delete db[userId];
    saveDb(db);
    res.json({ success: true, message: 'Deleted successfully' });
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`BFF listening on port ${PORT}`));
}

module.exports = app;
