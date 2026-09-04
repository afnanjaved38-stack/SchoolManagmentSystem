/**
 * Bootstrap the first platform admin.
 * Usage (from backend/):
 *   node add_admin.js
 *
 * Defaults match the public hackathon demo logins.
 * Override via ADMIN_EMAIL / ADMIN_PASSWORD in `.env` if needed.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { adminDisplayName } = require('./config/branding');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('--- INITIALIZING ADMIN USER ---');

  const adminEmail = (process.env.ADMIN_EMAIL || 'afnanjaved38@gmail.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123';

  const existingUser = await User.findOne({ email: adminEmail });

  if (existingUser) {
    existingUser.name = adminDisplayName;
    existingUser.password = adminPassword;
    existingUser.role = 'admin';
    await existingUser.save();
    console.log(`Updated existing Admin: ${adminEmail}`);
  } else {
    await User.create({
      name: adminDisplayName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin'
    });
    console.log(`Created NEW Admin: ${adminEmail}`);
  }

  console.log('DONE: Admin ready.');
  console.log(`Login → ${adminEmail} / ${adminPassword}`);
  process.exit(0);
}).catch((err) => {
  console.error('Error initializing admin:', err);
  process.exit(1);
});
