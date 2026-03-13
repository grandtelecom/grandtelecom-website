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

describe('Upload endpoint', () => {
  test('POST /api/upload/image requires auth', async () => {
    const res = await request(app)
      .post('/api/upload/image');

    expect([401, 403]).toContain(res.status);
  });

  test('POST /api/upload/image succeeds with token', async () => {
    const pngSig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x00]);
    const res = await request(app)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', pngSig, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body).toHaveProperty('filename');
  });
});
