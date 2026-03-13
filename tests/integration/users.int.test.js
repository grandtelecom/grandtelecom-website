const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongo;
let app;
let token;

jest.setTimeout(30000);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.PORT = '0';
  process.env.SUPERADMIN_USERNAME = 'superadmin';
  process.env.SUPERADMIN_PASSWORD = 'testpass123';
  app = require('../../backend/server');

  const login = await request(app)
    .post('/api/login')
    .send({ username: 'superadmin', password: 'testpass123' })
    .set('Accept', 'application/json');
  token = login.body.token;
});

afterAll(async () => {
  try { await mongoose.connection.close(); } catch (_) {}
  try { await mongoose.disconnect(); } catch (_) {}
  try { await mongo.stop(); } catch (_) {}
});

describe('Users CRUD', () => {
  const newUser = { username: 'user1', password: 'Passw0rd!', role: 'admin' };

  test('Create user (POST /api/users)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send(newUser)
      .set('Accept', 'application/json');

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toBeTruthy();
  });

  test('List users (GET /api/users) contains created user', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find(u => u && (u.username === 'user1' || u.username === newUser.username));
    expect(!!found).toBe(true);
  });

  test('Change password (PATCH /api/users/:username/password)', async () => {
    const res = await request(app)
      .patch(`/api/users/${encodeURIComponent(newUser.username)}/password`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'NewPassw0rd!' })
      .set('Accept', 'application/json');

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });

  test('Delete user (DELETE /api/users/:username)', async () => {
    const res = await request(app)
      .delete(`/api/users/${encodeURIComponent(newUser.username)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });
});
