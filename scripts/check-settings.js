const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../prisma/dev.db');
const db = new Database(dbPath);

try {
  const settings = db.prepare("SELECT * FROM AppSettings WHERE id = 1").get();
  if (settings) {
    console.log('✓ AppSettings from DB:');
    console.log('  - id:', settings.id);
    console.log('  - customerPercent:', settings.customerPercent);
    console.log('  - inviterPercent:', settings.inviterPercent);
    console.log('  - inviterBonusLevel2Percent:', settings.inviterBonusLevel2Percent);
  } else {
    console.log('⚠️ No settings found');
  }
} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  db.close();
}
