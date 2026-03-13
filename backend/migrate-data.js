/*
  One-time migration script: imports sections from backend/data.json into MongoDB
  Usage:
    - Ensure Mongo is running and MONGODB_URI is set if needed
    - Run: node migrate-data.js
*/

const path = require('path');
const fs = require('fs-extra');
const mongoose = require('mongoose');

const DATA_FILE = path.join(__dirname, 'data.json');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grandtelecom';
const DB_NAME = process.env.MONGODB_DB || 'grandtelecom';

async function main() {
  try {
    console.log(`[migrate] Connecting to MongoDB: ${MONGODB_URI}, db=${DB_NAME}`);
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });

    const ContentSchema = new mongoose.Schema(
      {
        section: { type: String, required: true, unique: true },
        data: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
      { timestamps: true }
    );
    ContentSchema.index({ section: 1 }, { unique: true });
    const Content = mongoose.model('Content', ContentSchema);

    if (!fs.existsSync(DATA_FILE)) {
      console.log('[migrate] No data.json found. Nothing to migrate.');
      return process.exit(0);
    }

    const legacy = fs.readJsonSync(DATA_FILE);
    const sections = ['homepage', 'services', 'tariffs', 'about', 'contact'];

    for (const section of sections) {
      const data = legacy[section];
      if (data) {
        await Content.updateOne(
          { section },
          { $set: { data } },
          { upsert: true }
        );
        console.log(`[migrate] Upserted section: ${section}`);
      } else {
        console.log(`[migrate] Skipped missing section: ${section}`);
      }
    }

    console.log('[migrate] Migration completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[migrate] Migration failed:', err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

main();
