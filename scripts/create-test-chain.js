const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../prisma/dev.db');
const db = new Database(dbPath);

try {
  const now = new Date().toISOString();

  // A - дедушка (L2)
  const a = db.prepare(`
    INSERT INTO User (login, phone, referralCode, role, bonusBalance, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('userA', '+77000000001', 'CHAIN_A', 'CUSTOMER', 0, now, now);

  // B - папа (L1) - приглашен A
  const b = db.prepare(`
    INSERT INTO User (login, phone, referralCode, referredByUserId, role, bonusBalance, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('userB', '+77000000002', 'CHAIN_B', a.lastInsertRowid, 'CUSTOMER', 0, now, now);

  // C - покупатель - приглашен B
  const c = db.prepare(`
    INSERT INTO User (login, phone, referralCode, referredByUserId, role, bonusBalance, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('userC', '+77000000003', 'CHAIN_C', b.lastInsertRowid, 'CUSTOMER', 0, now, now);

  const aid = a.lastInsertRowid;
  const bid = b.lastInsertRowid;
  const cid = c.lastInsertRowid;

  console.log('✓ Цепочка создана:');
  console.log(`  A (L2): id=${aid}, phone=+77000000001`);
  console.log(`  B (L1): id=${bid}, referredBy=${aid}`);
  console.log(`  C (buyer): id=${cid}, referredBy=${bid}`);

  // Создаем заказ от C
  const order = db.prepare(`
    INSERT INTO "Order" (userId, customerName, customerPhone, customerAddress, totalAmount, cashPaid, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cid, 'Customer C', '+77000000003', 'Test Address', 10000, 10000, 'NEW', now, now);

  const orderId = order.lastInsertRowid;
  console.log(`  Order: id=${orderId}, userId=${cid}, cashPaid=10000`);
  console.log('');
  console.log('📝 Для тестирования:');
  console.log(`  curl -X POST http://localhost:3000/api/orders/status \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -H "Cookie: sb_role=ADMIN; sb_userId=1" \\`);
  console.log(`    -d '{"orderId":${orderId},"status":"DONE"}'`);
  console.log('');
  console.log('✓ Проверка бонусов (должны быть L1 + L2):');
  console.log(`  B (L1): +500 (5% от 10000)`);
  console.log(`  A (L2): +300 (3% от 10000)`);

} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  db.close();
}
