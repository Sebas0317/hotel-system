const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { readJsonFile, writeJsonFile } = require('../src/data/jsonStoreHelper');

const USERS_FILE = path.join(__dirname, '../users.json');

async function main() {
  const users = await readJsonFile(USERS_FILE, []);

  const existing = users.find(u => u.email === 'dacastilloma@ut.edu.co');
  if (existing) {
    console.log('User already exists:', existing.email);
    return;
  }

  const passwordHash = await bcrypt.hash('ecohotel2024', 12);
  const now = new Date().toISOString();

  const user = {
    id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    username: 'dacastilloma',
    email: 'dacastilloma@ut.edu.co',
    passwordHash,
    firstName: 'David',
    lastName: 'Castillo',
    avatar: null,
    role: 'admin',
    isActive: true,
    emailVerified: true,
    twoFactorEnabled: true,
    lastLogin: null,
    lastIp: null,
    createdAt: now,
    updatedAt: now,
  };

  users.push(user);
  await writeJsonFile(USERS_FILE, users);
  console.log('Admin user created:', user.email);
  console.log('2FA enabled:', user.twoFactorEnabled);
}

main().catch(console.error);
