const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../prisma/dev.db');
const db = new Database(dbPath);

try {
  const result = db.prepare("UPDATE User SET role = ? WHERE login = ?").run('ADMIN', 'admin');
  if (result.changes > 0) {
    console.log('✓ User admin set as ADMIN');
  } else {
    console.log('⚠️ No user found with login "admin"');
  }
} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  db.close();
}
