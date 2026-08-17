import fs from 'fs';
import bcrypt from 'bcryptjs';
const db = JSON.parse(fs.readFileSync('data/spa_database.json','utf8'));
const u = db.users.find(x => x.email === 'admin@thecloudspa.in');
console.log('found', !!u);
console.log('hash', u.password_hash);
console.log('compare', bcrypt.compareSync('CloudSpa-Admin-2026!', u.password_hash));
