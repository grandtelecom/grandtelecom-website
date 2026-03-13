const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongo;
let app;

jest.setTimeout(30000);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.PORT = '0';
  process.env.SUPERADMIN_USERNAME = 'superadmin';
  process.env.SUPERADMIN_PASSWORD = 'testpass123';
  app = require('../../backend/server');
});

afterAll(async () => {
  try { await mongoose.connection.close(); } catch (_) {}
  try { await mongo.stop(); } catch (_) {}
});

describe('Auth flow', () => {
  test('POST /api/login with superadmin works', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'superadmin', password: 'testpass123', remember: false })
      .set('Accept', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('token');
  });

  test('GET /api/auth/me with token returns user', async () => {
    const login = await request(app)
      .post('/api/login')
      .send({ username: 'superadmin', password: 'testpass123' })
      .set('Accept', 'application/json');
    const token = login.body.token;
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body).toHaveProperty('username');
    expect(String(me.body.role).toLowerCase()).toBe('superadmin');
  });
});
