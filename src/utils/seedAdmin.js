require('dotenv').config();
const db = require('../db');
const { hashPassword } = require('./helpers');

async function seed() {
  try {
    const hashed = await hashPassword('admin123');
    await db.query(
      `INSERT INTO users (nama,email,password_hash,role) VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO NOTHING`,
      ['Admin Sistem','admin@eraport.local',hashed,'admin']
    );
    console.log('Admin seeded');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
seed();
