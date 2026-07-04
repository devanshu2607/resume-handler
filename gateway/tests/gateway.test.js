const request = require('supertest');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = require('../server');

jest.mock('axios');

const dbFile = path.join(__dirname, '..', 'resumes.json');

describe('Gateway API Tests', () => {
    let cookie;

    beforeEach(() => {
        jest.clearAllMocks();
        if (fs.existsSync(dbFile)) {
            fs.writeFileSync(dbFile, '{}');
        }
    });

    afterAll(() => {
        if (fs.existsSync(dbFile)) {
            try {
                fs.unlinkSync(dbFile);
            } catch {}
        }
    });

    test('POST /api/signup proxies call to Quarkus', async () => {
        axios.post.mockResolvedValue({
            status: 201,
            data: { id: 1, email: 'test@example.com', emailValidated: false, validationToken: 'token-123' }
        });

        const res = await request(app)
            .post('/api/signup')
            .send({ email: 'test@example.com', password: 'password' });

        expect(res.status).toBe(201);
        expect(res.body.email).toBe('test@example.com');
        expect(res.body.validationToken).toBe('token-123');
    });

    test('POST /api/login sets session cookie', async () => {
        axios.post.mockResolvedValue({
            status: 200,
            data: { id: 1, email: 'test@example.com', emailValidated: false }
        });

        const res = await request(app)
            .post('/api/login')
            .send({ email: 'test@example.com', password: 'password' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.headers['set-cookie']).toBeDefined();
        cookie = res.headers['set-cookie'][0];
    });

    test('GET /api/session returns session data when logged in', async () => {
        const res = await request(app)
            .get('/api/session')
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.loggedIn).toBe(true);
        expect(res.body.user.email).toBe('test@example.com');
    });

    test('GET /api/resumes/my returns 403 when email is not validated', async () => {
        const res = await request(app)
            .get('/api/resumes/my')
            .set('Cookie', cookie);

        expect(res.status).toBe(403);
    });

    test('POST /api/verify updates session validation state', async () => {
        axios.post.mockResolvedValue({ status: 200, data: { success: true } });

        const res = await request(app)
            .post('/api/verify')
            .set('Cookie', cookie)
            .send({ token: 'token-123' });

        expect(res.status).toBe(200);

        const session = await request(app)
            .get('/api/session')
            .set('Cookie', cookie);

        expect(session.body.user.emailValidated).toBe(true);
    });

    test('POST, GET, PUT, DELETE /api/resumes works for validated user', async () => {
        const createRes = await request(app)
            .post('/api/resumes')
            .set('Cookie', cookie)
            .send({ fullName: 'John Doe', title: 'Developer' });

        expect(createRes.status).toBe(201);
        expect(createRes.body.fullName).toBe('John Doe');

        const getRes = await request(app)
            .get('/api/resumes/my')
            .set('Cookie', cookie);

        expect(getRes.status).toBe(200);

        const updateRes = await request(app)
            .put('/api/resumes/my')
            .set('Cookie', cookie)
            .send({ fullName: 'John Updated' });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.fullName).toBe('John Updated');

        const deleteRes = await request(app)
            .delete('/api/resumes/my')
            .set('Cookie', cookie);

        expect(deleteRes.status).toBe(200);

        const checkRes = await request(app)
            .get('/api/resumes/my')
            .set('Cookie', cookie);

        expect(checkRes.status).toBe(404);
    });

    test('POST /api/logout clears session', async () => {
        const res = await request(app)
            .post('/api/logout')
            .set('Cookie', cookie);

        expect(res.status).toBe(200);

        const session = await request(app)
            .get('/api/session')
            .set('Cookie', cookie);

        expect(session.body.loggedIn).toBe(false);
    });
});
