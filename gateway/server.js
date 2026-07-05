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
        httpOnly: true
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
        const user = { ...response.data };
        delete user.passwordHash;
        delete user.validationToken;
        res.status(response.status).json(user);
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
        const data = { ...response.data };
        delete data.passwordHash;
        delete data.validationToken;
        res.status(response.status).json(data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { message: 'Verification failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const response = await axios.post(`${QUARKUS_URL}/users/login`, req.body);
        const user = { ...response.data };
        delete user.passwordHash;
        delete user.validationToken;
        req.session.user = user;
        res.json({ success: true, user });
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { message: 'Login failed' });
    }
});

app.post('/api/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            res.clearCookie('connect.sid', { secure: true, sameSite: 'none' });
            res.json({ success: true });
        });
    } else {
        res.json({ success: true });
    }
});

app.get('/api/session', (req, res) => {
    res.json({
        loggedIn: !!req.session?.user,
        user: req.session?.user || null
    });
});

app.get('/api/resumes/my', auth, verified, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const response = await axios.get(`${QUARKUS_URL}/users/${userId}/resume`);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { message: 'Failed to fetch resume' });
    }
});

app.post('/api/resumes', auth, verified, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const response = await axios.post(`${QUARKUS_URL}/users/${userId}/resume`, req.body);
        res.status(response.status).json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { message: 'Failed to save resume' });
    }
});

app.put('/api/resumes/my', auth, verified, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const response = await axios.put(`${QUARKUS_URL}/users/${userId}/resume`, req.body);
        res.status(response.status).json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { message: 'Failed to update resume' });
    }
});

app.delete('/api/resumes/my', auth, verified, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const response = await axios.delete(`${QUARKUS_URL}/users/${userId}/resume`);
        res.status(response.status).json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { message: 'Failed to delete resume' });
    }
});

app.post('/api/resend', async (req, res) => {
    try {
        const response = await axios.post(`${QUARKUS_URL}/users/resend`, req.body);
        res.status(response.status).json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { message: 'Failed to resend' });
    }
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`BFF listening on port ${PORT}`));
}

module.exports = app;
