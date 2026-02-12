const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../prisma/dev.db');
const db = new Database(dbPath);

try {
  const duplicates = db.prepare(`
    SELECT orderId, type, COUNT(*) as count
    FROM ReferralEvent
    WHERE orderId IS NOT NULL AND type = 'LEVEL_BONUS'
    GROUP BY orderId, type
    HAVING count > 1
  `).all();
  
  if (duplicates.length > 0) {
    console.log('⚠️ Дубликаты найдены:');
    duplicates.forEach(d => {
      console.log(`  - orderId: ${d.orderId}, type: ${d.type}, count: ${d.count}`);
    });
  } else {
    console.log('✓ Дубликатов не найдено');
  }
} catch (e) {
  console.log('❌ Ошибка (вероятно, таблица пуста):', e.message);
} finally {
  db.close();
}
