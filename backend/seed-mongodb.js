/*
  Seed script to restore MongoDB database with initial collections and data.
  It creates the following collections if they do not exist: users, pages, settings, logs.
  It also ensures a superadmin user, a default homepage page, and a maintenance setting.

  Usage:
    - Ensure MongoDB is running.
    - Optionally set environment variables:
        MONGODB_URI (default: mongodb://localhost:27017/grandtelecom)
        MONGODB_DB  (default: grandtelecom)
        SUPERADMIN_USERNAME (default: superadmin)
        SUPERADMIN_PASSWORD (default: change_this_password)
    - Run: node backend/seed-mongodb.js

  The script is idempotent: running multiple times will not create duplicates.
*/

const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grandtelecom';
const DB_NAME = process.env.MONGODB_DB || 'grandtelecom';
const SUPERADMIN_USERNAME = (process.env.SUPERADMIN_USERNAME || 'superadmin').trim();
const SUPERADMIN_PASSWORD = (process.env.SUPERADMIN_PASSWORD || 'change_this_password').trim();

function ensureObjectId(id) {
  try { return new mongoose.Types.ObjectId(id); } catch { return undefined; }
}

async function main() {
  try {
    console.log(`[seed] Connecting to ${MONGODB_URI} (db=${DB_NAME})...`);
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });

    // Define lightweight schemas for needed collections
    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true }, // keep compatibility with issue description
      passwordHash: { type: String }, // for backend compatibility if needed later
      salt: { type: String, default: '' },
      role: { type: String, enum: ['superadmin','admin','user'], default: 'user' },
      isActive: { type: Boolean, default: true },
    }, { timestamps: true });
    UserSchema.index({ username: 1 }, { unique: true });
    const User = mongoose.model('users', UserSchema); // explicit collection name "users"

    const PageSchema = new mongoose.Schema({
      page: { type: String, required: true, unique: true },
      title: { type: String, default: '' },
      heroTitle: { type: String, default: '' },
      heroSubtitle: { type: String, default: '' },
    }, { timestamps: true });
    PageSchema.index({ page: 1 }, { unique: true });
    const Page = mongoose.model('pages', PageSchema);

    const SettingSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: mongoose.Schema.Types.Mixed, default: null },
      description: { type: String, default: '' },
    }, { timestamps: true });
    SettingSchema.index({ key: 1 }, { unique: true });
    const Setting = mongoose.model('settings', SettingSchema);

    const LogSchema = new mongoose.Schema({
      level: { type: String, enum: ['info','warn','error'], default: 'info' },
      message: { type: String, required: true },
      meta: { type: mongoose.Schema.Types.Mixed },
    }, { timestamps: true });
    const Log = mongoose.model('logs', LogSchema);

    // 1) Ensure collections exist by initializing models and creating indexes
    await Promise.all([
      User.init(), Page.init(), Setting.init(), Log.init()
    ]);
    console.log('[seed] Collections ensured: users, pages, settings, logs');

    // 2) Upsert superadmin user
    const bcryptHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
    const userUpdate = {
      $setOnInsert: { createdAt: new Date() },
      $set: {
        username: SUPERADMIN_USERNAME,
        password: bcryptHash, // stored as bcrypt in "password" to match description key
        passwordHash: bcryptHash, // also store in passwordHash for backend compatibility
        role: 'superadmin',
        isActive: true,
        updatedAt: new Date(),
      },
    };
    await User.updateOne({ username: SUPERADMIN_USERNAME }, userUpdate, { upsert: true });
    console.log(`[seed] Superadmin ensured: ${SUPERADMIN_USERNAME}`);

    // 3) Upsert default home page
    await Page.updateOne(
      { page: 'home' },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: {
          title: 'Grand Telecom',
          heroTitle: 'Xoş gəlmisiniz',
          heroSubtitle: 'Ən yüksək keyfiyyətli xidmətlər',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log('[seed] Default page ensured: home');

    // 4) Upsert default settings
    await Setting.updateOne(
      { key: 'maintenance' },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: { value: false, description: 'Saytın texniki xidməti rejimi', updatedAt: new Date() },
      },
      { upsert: true }
    );
    console.log('[seed] Setting ensured: maintenance=false');

    // 5) Optionally add a seed log entry only if logs are empty
    const logsCount = await Log.estimatedDocumentCount();
    if (logsCount === 0) {
      await Log.create({ level: 'info', message: 'Initial seed completed', meta: { by: 'seed-mongodb.js' } });
      console.log('[seed] Log entry created');
    }

    await mongoose.disconnect();
    console.log('[seed] Completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[seed] Failed:', err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

main();
