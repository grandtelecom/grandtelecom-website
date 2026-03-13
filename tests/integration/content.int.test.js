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
  app = require('../../backend/server');
});

afterAll(async () => {
  try { await mongoose.connection.close(); } catch (_) {}
  try { await mongo.stop(); } catch (_) {}
});

describe('Content endpoints', () => {
  test('GET /api/content/homepage returns default structure', async () => {
    const res = await request(app).get('/api/content/homepage');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hero');
    expect(res.body.hero).toHaveProperty('title');
  });
});
