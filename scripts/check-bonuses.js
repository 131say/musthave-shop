const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../prisma/dev.db');
const db = new Database(dbPath);

try {
  console.log('📊 Бонусы пользователей:');
  const users = db.prepare(`
    SELECT id, login, bonusBalance FROM User WHERE id IN (1, 2, 3)
  `).all();
  
  users.forEach(u => {
    console.log(`  ${u.login} (id=${u.id}): bonusBalance=${u.bonusBalance}`);
  });

  console.log('');
  console.log('📋 ReferralEvent за заказ #1:');
  const events = db.prepare(`
    SELECT id, userId, type, amount, note FROM ReferralEvent WHERE orderId = 1 ORDER BY createdAt
  `).all();
  
  if (events.length === 0) {
    console.log('  ❌ Событий не найдено!');
  } else {
    events.forEach(e => {
      console.log(`  id=${e.id}, userId=${e.userId}, type=${e.type}, amount=${e.amount}`);
      console.log(`    note: ${e.note}`);
    });
  }

  console.log('');
  console.log('✓ Проверка уникальности (не должно быть дубля LEVEL_BONUS):');
  const dupes = db.prepare(`
    SELECT type, COUNT(*) as count FROM ReferralEvent 
    WHERE orderId = 1 
    GROUP BY type
  `).all();
  
  dupes.forEach(d => {
    console.log(`  ${d.type}: ${d.count}`);
  });

} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  db.close();
}
