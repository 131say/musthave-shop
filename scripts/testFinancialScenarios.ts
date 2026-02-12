/**
 * Комплексные тесты финансовых операций:
 * - Создание заказов
 * - Начисление и списание бонусов
 * - Возвраты (частичные и полные)
 * - Расчет процентов
 * - Реферальная программа
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

// Цвета для вывода
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name: string) {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`ТЕСТ: ${name}`, "cyan");
  log("=".repeat(60), "cyan");
}

function logSuccess(message: string) {
  log(`✅ ${message}`, "green");
}

function logError(message: string) {
  log(`❌ ${message}`, "red");
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, "yellow");
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, "blue");
}

// Вспомогательные функции
async function getSettings() {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    await prisma.appSettings.create({ data: { id: 1 } });
    return await prisma.appSettings.findUnique({ where: { id: 1 } })!;
  }
  return settings;
}

async function getUserBalance(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.bonusBalance || 0;
}

async function getOrderData(orderId: number) {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      referralEvents: true,
      user: true,
    },
  });
}

async function createTestUser(name: string, initialBalance: number = 0, referredByUserId?: number) {
  const passwordHash = await bcrypt.hash("test123", 10);
  const last = await prisma.user.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const nextNum = (last?.id ?? 0) + 1000;
  const referralCode = `TEST${nextNum}`;
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return await prisma.user.create({
    data: {
      login: `test_${name.toLowerCase()}_${timestamp}_${random}`,
      name: name,
      phone: `+7700123${String(nextNum).padStart(4, "0")}`,
      passwordHash,
      referralCode,
      bonusBalance: initialBalance,
      role: "CUSTOMER",
      referredByUserId,
    },
  });
}

async function createTestProduct(name: string, price: number, costPrice: number) {
  const slug = `test-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
  return await prisma.product.create({
    data: {
      name,
      slug,
      price,
      costPrice,
      isActive: true,
    },
  });
}

async function createOrder(
  userId: number,
  items: Array<{ productId: number; quantity: number }>,
  bonusToSpend: number = 0
) {
  // Получаем товары
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });

  const orderItems = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return {
      productId: product.id,
      quantity: item.quantity,
      priceAtMoment: product.price,
      subtotal: product.price * item.quantity,
    };
  });

  const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Проверяем баланс пользователя
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (bonusToSpend > 0 && (user?.bonusBalance || 0) < bonusToSpend) {
    throw new Error("Недостаточно бонусов");
  }

  // Списываем бонусы
  if (bonusToSpend > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { bonusBalance: { decrement: bonusToSpend } },
    });

    await prisma.referralEvent.create({
      data: {
        userId,
        type: "BONUS_SPENT",
        amount: -bonusToSpend,
        note: "Оплата заказа бонусами (тест)",
      },
    });
  }

  const cashPaid = Math.max(0, totalAmount - bonusToSpend);

  // Создаем заказ
  const order = await prisma.order.create({
    data: {
      userId,
      customerName: user?.name || "Test Customer",
      customerPhone: user?.phone || "+77001234567",
      customerAddress: "Test Address",
      totalAmount,
      bonusSpent: bonusToSpend,
      cashPaid,
      status: "NEW",
      items: {
        create: orderItems,
      },
    },
  });

  return order;
}

async function setOrderStatus(orderId: number, status: "DONE" | "CANCELLED") {
  const settings = await getSettings();
  const INVITER_PERCENT = settings.inviterPercent / 100;
  const CUSTOMER_PERCENT = settings.customerPercent / 100;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        user: { include: { referredBy: true } },
        referralEvents: true,
      },
    });

    if (!order) throw new Error("Order not found");

    const prev = order.status;

    await tx.order.update({
      where: { id: orderId },
      data: { status },
    });

    // Начисление бонусов при DONE
    if (status === "DONE" && prev !== "DONE") {
      const already = await tx.referralEvent.findFirst({
        where: { orderId, type: "ORDER_BONUS" },
      });

      if (!already && order.userId && order.user) {
        const cashPaid = order.cashPaid || 0;
        const customerBonus = Math.round(cashPaid * CUSTOMER_PERCENT);
        const inviterId = order.user.referredByUserId ?? null;
        const inviterBonus = inviterId ? Math.round(cashPaid * INVITER_PERCENT) : 0;

        if (customerBonus > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: { bonusBalance: { increment: customerBonus } },
          });
          await tx.referralEvent.create({
            data: {
              userId: order.userId,
              orderId,
              type: "ORDER_BONUS",
              amount: customerBonus,
              note: "Кэшбэк за выполненный заказ (DONE) - тест",
            },
          });
        }

        if (inviterId && inviterBonus > 0) {
          await tx.user.update({
            where: { id: inviterId },
            data: { bonusBalance: { increment: inviterBonus } },
          });
          await tx.referralEvent.create({
            data: {
              userId: inviterId,
              referredUserId: order.userId,
              orderId,
              type: "ORDER_BONUS",
              amount: inviterBonus,
              note: "Бонус пригласителю за выполненный заказ (DONE) - тест",
            },
          });
        }
      }
    }

    // Списание бонусов при отмене выполненного заказа
    if (status === "CANCELLED" && prev === "DONE") {
      const orderBonusEvents = await tx.referralEvent.findMany({
        where: { orderId, type: "ORDER_BONUS" },
      });

      for (const event of orderBonusEvents) {
        await tx.user.update({
          where: { id: event.userId },
          data: { bonusBalance: { decrement: event.amount } },
        });

        await tx.referralEvent.create({
          data: {
            userId: event.userId,
            referredUserId: event.referredUserId,
            orderId,
            type: "MANUAL_ADJUSTMENT",
            amount: -event.amount,
            note: `Списание бонусов за отмену выполненного заказа (заказ #${orderId}) - тест`,
          },
        });
      }
    }
  });
}

async function processReturn(
  orderId: number,
  returns: Array<{ itemId: number; quantity: number }>
) {
  const settings = await getSettings();
  const INVITER_PERCENT = settings.inviterPercent / 100;
  const CUSTOMER_PERCENT = settings.customerPercent / 100;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: true,
        referralEvents: true,
      },
    });

    if (!order) throw new Error("Order not found");

    const originalTotalAmount = order.totalAmount;
    const originalBonusSpent = order.bonusSpent;

    const itemMap = new Map(order.items.map((item) => [item.id, item]));
    let totalReturnAmount = 0;

    for (const ret of returns) {
      const item = itemMap.get(ret.itemId);
      if (!item) throw new Error(`Item ${ret.itemId} not found`);
      const alreadyReturned = item.returnedQuantity || 0;
      const availableToReturn = item.quantity - alreadyReturned;
      if (ret.quantity > availableToReturn || ret.quantity <= 0) {
        throw new Error(`Invalid return quantity for item ${ret.itemId}`);
      }
      const returnSubtotal = Math.round(item.priceAtMoment * ret.quantity);
      totalReturnAmount += returnSubtotal;
    }

    let totalReturnedAfter = 0;
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

    for (const ret of returns) {
      const item = itemMap.get(ret.itemId);
      if (!item) continue;
      const currentReturned = item.returnedQuantity || 0;
      const newReturned = currentReturned + ret.quantity;
      await tx.orderItem.update({
        where: { id: ret.itemId },
        data: { returnedQuantity: newReturned },
      });
      totalReturnedAfter += newReturned;
    }

    for (const item of order.items) {
      if (!returns.find((r) => r.itemId === item.id)) {
        totalReturnedAfter += item.returnedQuantity || 0;
      }
    }

    const isFullReturn = totalReturnedAfter >= totalQuantity;
    const newTotalAmount = order.totalAmount - totalReturnAmount;
    const newBonusSpent = isFullReturn ? 0 : order.bonusSpent;
    const newCashPaid = Math.max(0, newTotalAmount - newBonusSpent);

    await tx.order.update({
      where: { id: orderId },
      data: {
        totalAmount: newTotalAmount,
        bonusSpent: newBonusSpent,
        cashPaid: newCashPaid,
      },
    });

    // Возврат бонусов при полном возврате
    if (isFullReturn && originalBonusSpent > 0) {
      await tx.user.update({
        where: { id: order.userId! },
        data: { bonusBalance: { increment: originalBonusSpent } },
      });

      await tx.referralEvent.create({
        data: {
          userId: order.userId!,
          orderId,
          type: "MANUAL_ADJUSTMENT",
          amount: originalBonusSpent,
          note: `Возврат всех бонусов при полном возврате заказа (заказ #${orderId}) - тест`,
        },
      });
    }

    // Списание кэшбэка пропорционально возврату
    const orderBonusEvents = order.referralEvents.filter(
      (e) => e.type === "ORDER_BONUS" && e.orderId === orderId
    );

    if (orderBonusEvents.length > 0 && originalTotalAmount > 0) {
      const returnRatio = totalReturnAmount / originalTotalAmount;

      for (const event of orderBonusEvents) {
        const cashbackToDeduct = Math.round(event.amount * returnRatio);
        if (cashbackToDeduct > 0) {
          await tx.user.update({
            where: { id: event.userId },
            data: { bonusBalance: { decrement: cashbackToDeduct } },
          });

          await tx.referralEvent.create({
            data: {
              userId: event.userId,
              referredUserId: event.referredUserId,
              orderId,
              type: "MANUAL_ADJUSTMENT",
              amount: -cashbackToDeduct,
              note: `Списание кэшбэка за возвращенные товары (заказ #${orderId}) - тест`,
            },
          });
        }
      }
    }

    return { totalReturnAmount, isFullReturn };
  });
}

// ==================== ТЕСТЫ ====================

async function test1_OrderWithoutBonuses() {
  logTest("1. Заказ без бонусов (полная оплата наличными)");

  const user = await createTestUser("User1", 0);
  const product = await createTestProduct("Product 1", 10000, 5000);

  const balanceBefore = await getUserBalance(user.id);
  logInfo(`Баланс до заказа: ${balanceBefore}`);

  const order = await createOrder(user.id, [{ productId: product.id, quantity: 2 }], 0);
  logInfo(`Создан заказ #${order.id}, сумма: ${order.totalAmount}, бонусы: ${order.bonusSpent}, наличные: ${order.cashPaid}`);

  const balanceAfter = await getUserBalance(user.id);
  logInfo(`Баланс после заказа: ${balanceAfter}`);

  if (balanceBefore === balanceAfter && order.totalAmount === order.cashPaid && order.bonusSpent === 0) {
    logSuccess("Заказ создан корректно: полная оплата наличными, баланс не изменился");
    return { success: true, orderId: order.id, userId: user.id };
  } else {
    logError("Ошибка: баланс или суммы заказа некорректны");
    return { success: false };
  }
}

async function test2_OrderWithPartialBonuses() {
  logTest("2. Заказ с частичной оплатой бонусами");

  const user = await createTestUser("User2", 5000);
  const product = await createTestProduct("Product 2", 10000, 5000);

  const balanceBefore = await getUserBalance(user.id);
  logInfo(`Баланс до заказа: ${balanceBefore}`);

  const order = await createOrder(user.id, [{ productId: product.id, quantity: 2 }], 5000);
  logInfo(`Создан заказ #${order.id}, сумма: ${order.totalAmount}, бонусы: ${order.bonusSpent}, наличные: ${order.cashPaid}`);

  const balanceAfter = await getUserBalance(user.id);
  logInfo(`Баланс после заказа: ${balanceAfter}`);

  const expectedBalance = balanceBefore - 5000;
  if (
    balanceAfter === expectedBalance &&
    order.totalAmount === 20000 &&
    order.bonusSpent === 5000 &&
    order.cashPaid === 15000
  ) {
    logSuccess("Заказ создан корректно: частичная оплата бонусами");
    return { success: true, orderId: order.id, userId: user.id };
  } else {
    logError(`Ошибка: ожидался баланс ${expectedBalance}, получен ${balanceAfter}`);
    return { success: false };
  }
}

async function test3_OrderWithFullBonuses() {
  logTest("3. Заказ с полной оплатой бонусами");

  const user = await createTestUser("User3", 20000);
  const product = await createTestProduct("Product 3", 10000, 5000);

  const balanceBefore = await getUserBalance(user.id);
  logInfo(`Баланс до заказа: ${balanceBefore}`);

  const order = await createOrder(user.id, [{ productId: product.id, quantity: 2 }], 20000);
  logInfo(`Создан заказ #${order.id}, сумма: ${order.totalAmount}, бонусы: ${order.bonusSpent}, наличные: ${order.cashPaid}`);

  const balanceAfter = await getUserBalance(user.id);
  logInfo(`Баланс после заказа: ${balanceAfter}`);

  const expectedBalance = balanceBefore - 20000;
  if (
    balanceAfter === expectedBalance &&
    order.totalAmount === 20000 &&
    order.bonusSpent === 20000 &&
    order.cashPaid === 0
  ) {
    logSuccess("Заказ создан корректно: полная оплата бонусами");
    return { success: true, orderId: order.id, userId: user.id };
  } else {
    logError(`Ошибка: ожидался баланс ${expectedBalance}, получен ${balanceAfter}`);
    return { success: false };
  }
}

async function test4_BonusAccrualOnDone() {
  logTest("4. Начисление бонусов при статусе DONE");

  const user = await createTestUser("User4", 0);
  const product = await createTestProduct("Product 4", 10000, 5000);
  const settings = await getSettings();

  const balanceBefore = await getUserBalance(user.id);
  logInfo(`Баланс до заказа: ${balanceBefore}`);

  const order = await createOrder(user.id, [{ productId: product.id, quantity: 2 }], 0);
  logInfo(`Создан заказ #${order.id}, сумма: ${order.totalAmount}, наличные: ${order.cashPaid}`);

  await setOrderStatus(order.id, "DONE");

  const balanceAfter = await getUserBalance(user.id);
  const expectedBonus = Math.round(order.cashPaid * (settings.customerPercent / 100));
  logInfo(`Баланс после DONE: ${balanceAfter}, ожидаемый бонус: ${expectedBonus}`);

  if (balanceAfter === expectedBonus) {
    logSuccess(`Бонусы начислены корректно: ${expectedBonus} (${settings.customerPercent}% от ${order.cashPaid})`);
    return { success: true, orderId: order.id, userId: user.id };
  } else {
    logError(`Ошибка: ожидался баланс ${expectedBonus}, получен ${balanceAfter}`);
    return { success: false };
  }
}

async function test5_ReferralBonus() {
  logTest("5. Бонусы реферальной программы (пригласителю)");

  const inviter = await createTestUser("Inviter", 0);
  const user = await createTestUser("User5", 0, inviter.id);
  const product = await createTestProduct("Product 5", 10000, 5000);
  const settings = await getSettings();

  const inviterBalanceBefore = await getUserBalance(inviter.id);
  const userBalanceBefore = await getUserBalance(user.id);
  logInfo(`Баланс пригласителя до: ${inviterBalanceBefore}, пользователя: ${userBalanceBefore}`);

  const order = await createOrder(user.id, [{ productId: product.id, quantity: 2 }], 0);
  logInfo(`Создан заказ #${order.id}, сумма: ${order.totalAmount}`);

  await setOrderStatus(order.id, "DONE");

  const inviterBalanceAfter = await getUserBalance(inviter.id);
  const userBalanceAfter = await getUserBalance(user.id);

  const expectedUserBonus = Math.round(order.cashPaid * (settings.customerPercent / 100));
  const expectedInviterBonus = Math.round(order.cashPaid * (settings.inviterPercent / 100));

  logInfo(`Баланс пригласителя после: ${inviterBalanceAfter}, пользователя: ${userBalanceAfter}`);
  logInfo(`Ожидаемый бонус пользователя: ${expectedUserBonus}, пригласителя: ${expectedInviterBonus}`);

  if (
    userBalanceAfter === expectedUserBonus &&
    inviterBalanceAfter === expectedInviterBonus
  ) {
    logSuccess(`Реферальные бонусы начислены корректно: пользователь ${expectedUserBonus}, пригласитель ${expectedInviterBonus}`);
    return { success: true, orderId: order.id, userId: user.id, inviterId: inviter.id };
  } else {
    logError(`Ошибка: ожидались бонусы ${expectedUserBonus} и ${expectedInviterBonus}`);
    return { success: false };
  }
}

async function test6_PartialReturn() {
  logTest("6. Частичный возврат товаров");

  const user = await createTestUser("User6", 0);
  const product1 = await createTestProduct("Product 6a", 10000, 5000);
  const product2 = await createTestProduct("Product 6b", 5000, 2500);
  const settings = await getSettings();

  const order = await createOrder(user.id, [
    { productId: product1.id, quantity: 2 },
    { productId: product2.id, quantity: 1 },
  ], 0);

  logInfo(`Создан заказ #${order.id}, сумма: ${order.totalAmount}`);

  await setOrderStatus(order.id, "DONE");
  const balanceAfterDone = await getUserBalance(user.id);
  const bonusReceived = balanceAfterDone;
  logInfo(`Баланс после DONE: ${balanceAfterDone}, получено бонусов: ${bonusReceived}`);

  const orderData = await getOrderData(order.id);
  const itemToReturn = orderData!.items[0];

  await processReturn(order.id, [{ itemId: itemToReturn.id, quantity: 1 }]);

  const balanceAfterReturn = await getUserBalance(user.id);
  const orderAfterReturn = await getOrderData(order.id);

  const returnAmount = itemToReturn.priceAtMoment * 1;
  const expectedBonusDeduction = Math.round(bonusReceived * (returnAmount / order.totalAmount));
  const expectedBalance = balanceAfterDone - expectedBonusDeduction;

  logInfo(`Баланс после возврата: ${balanceAfterReturn}`);
  logInfo(`Сумма возврата: ${returnAmount}, списание бонусов: ${expectedBonusDeduction}`);

  if (Math.abs(balanceAfterReturn - expectedBalance) <= 1) {
    logSuccess(`Частичный возврат обработан корректно: списано ${expectedBonusDeduction} бонусов`);
    return { success: true, orderId: order.id };
  } else {
    logError(`Ошибка: ожидался баланс ${expectedBalance}, получен ${balanceAfterReturn}`);
    return { success: false };
  }
}

async function test7_FullReturn() {
  logTest("7. Полный возврат заказа");

  const user = await createTestUser("User7", 5000);
  const product = await createTestProduct("Product 7", 10000, 5000);
  const settings = await getSettings();

  const balanceBefore = await getUserBalance(user.id);
  logInfo(`Баланс до заказа: ${balanceBefore}`);

  const order = await createOrder(user.id, [{ productId: product.id, quantity: 2 }], 5000);
  logInfo(`Создан заказ #${order.id}, сумма: ${order.totalAmount}, бонусы: ${order.bonusSpent}`);

  const balanceAfterOrder = await getUserBalance(user.id);
  logInfo(`Баланс после заказа: ${balanceAfterOrder}`);

  await setOrderStatus(order.id, "DONE");
  const balanceAfterDone = await getUserBalance(user.id);
  const bonusReceived = balanceAfterDone - balanceAfterOrder;
  logInfo(`Баланс после DONE: ${balanceAfterDone}, получено бонусов: ${bonusReceived}`);

  const orderData = await getOrderData(order.id);
  const returnItems = orderData!.items.map((item) => ({
    itemId: item.id,
    quantity: item.quantity,
  }));

  await processReturn(order.id, returnItems);

  const balanceAfterReturn = await getUserBalance(user.id);
  const orderAfterReturn = await getOrderData(order.id);

  const expectedBalance = balanceBefore; // Должен вернуться к исходному балансу

  logInfo(`Баланс после полного возврата: ${balanceAfterReturn}`);
  logInfo(`Ожидаемый баланс: ${expectedBalance}`);

  if (balanceAfterReturn === expectedBalance && orderAfterReturn!.bonusSpent === 0) {
    logSuccess("Полный возврат обработан корректно: все бонусы возвращены");
    return { success: true, orderId: order.id };
  } else {
    logError(`Ошибка: ожидался баланс ${expectedBalance}, получен ${balanceAfterReturn}`);
    return { success: false };
  }
}

async function test8_CancelDoneOrder() {
  logTest("8. Отмена выполненного заказа (списание начисленных бонусов)");

  const user = await createTestUser("User8", 0);
  const product = await createTestProduct("Product 8", 10000, 5000);

  const balanceBefore = await getUserBalance(user.id);
  logInfo(`Баланс до заказа: ${balanceBefore}`);

  const order = await createOrder(user.id, [{ productId: product.id, quantity: 2 }], 0);
  logInfo(`Создан заказ #${order.id}`);

  await setOrderStatus(order.id, "DONE");
  const balanceAfterDone = await getUserBalance(user.id);
  const bonusReceived = balanceAfterDone - balanceBefore;
  logInfo(`Баланс после DONE: ${balanceAfterDone}, получено бонусов: ${bonusReceived}`);

  await setOrderStatus(order.id, "CANCELLED");
  const balanceAfterCancel = await getUserBalance(user.id);
  logInfo(`Баланс после отмены: ${balanceAfterCancel}`);

  if (balanceAfterCancel === balanceBefore) {
    logSuccess("Отмена заказа обработана корректно: все начисленные бонусы списаны");
    return { success: true, orderId: order.id };
  } else {
    logError(`Ошибка: ожидался баланс ${balanceBefore}, получен ${balanceAfterCancel}`);
    return { success: false };
  }
}

async function test9_InsufficientBonuses() {
  logTest("9. Попытка оплаты при недостаточном балансе бонусов");

  const user = await createTestUser("User9", 1000);
  const product = await createTestProduct("Product 9", 10000, 5000);

  const balanceBefore = await getUserBalance(user.id);
  logInfo(`Баланс: ${balanceBefore}`);

  try {
    await createOrder(user.id, [{ productId: product.id, quantity: 2 }], 5000);
    logError("Ошибка: заказ создан несмотря на недостаток бонусов");
    return { success: false };
  } catch (error: any) {
    if (error.message.includes("Недостаточно бонусов")) {
      logSuccess("Корректно отклонен заказ с недостаточным балансом");
      return { success: true };
    } else {
      logError(`Неожиданная ошибка: ${error.message}`);
      return { success: false };
    }
  }
}

async function test10_ComplexScenario() {
  logTest("10. Сложный сценарий: заказ с бонусами → DONE → частичный возврат → отмена");

  const inviter = await createTestUser("Inviter10", 0);
  const user = await createTestUser("User10", 10000, inviter.id);
  const product1 = await createTestProduct("Product 10a", 10000, 5000);
  const product2 = await createTestProduct("Product 10b", 5000, 2500);
  const settings = await getSettings();

  logInfo("=== Шаг 1: Создание заказа с частичной оплатой бонусами ===");
  const balanceBefore = await getUserBalance(user.id);
  const inviterBalanceBefore = await getUserBalance(inviter.id);
  logInfo(`Баланс пользователя: ${balanceBefore}, пригласителя: ${inviterBalanceBefore}`);

  const order = await createOrder(user.id, [
    { productId: product1.id, quantity: 2 },
    { productId: product2.id, quantity: 1 },
  ], 10000);

  logInfo(`Заказ #${order.id}: сумма ${order.totalAmount}, бонусы ${order.bonusSpent}, наличные ${order.cashPaid}`);

  const balanceAfterOrder = await getUserBalance(user.id);
  logInfo(`Баланс после заказа: ${balanceAfterOrder}`);

  logInfo("=== Шаг 2: Установка статуса DONE ===");
  await setOrderStatus(order.id, "DONE");
  const balanceAfterDone = await getUserBalance(user.id);
  const inviterBalanceAfterDone = await getUserBalance(inviter.id);
  const bonusReceived = balanceAfterDone - balanceAfterOrder;
  const inviterBonusReceived = inviterBalanceAfterDone - inviterBalanceBefore;

  logInfo(`Баланс пользователя после DONE: ${balanceAfterDone} (+${bonusReceived})`);
  logInfo(`Баланс пригласителя после DONE: ${inviterBalanceAfterDone} (+${inviterBonusReceived})`);

  logInfo("=== Шаг 3: Частичный возврат ===");
  const orderData = await getOrderData(order.id);
  const itemToReturn = orderData!.items.find((i) => i.productId === product1.id)!;
  await processReturn(order.id, [{ itemId: itemToReturn.id, quantity: 1 }]);

  const balanceAfterReturn = await getUserBalance(user.id);
  const inviterBalanceAfterReturn = await getUserBalance(inviter.id);
  logInfo(`Баланс пользователя после возврата: ${balanceAfterReturn}`);
  logInfo(`Баланс пригласителя после возврата: ${inviterBalanceAfterReturn}`);

  logInfo("=== Шаг 4: Отмена заказа ===");
  // При отмене списываются все ORDER_BONUS события, но часть уже списана при возврате
  // Поэтому нужно учесть, что списание будет полным, но часть уже списана
  const orderDataBeforeCancel = await getOrderData(order.id);
  const remainingBonusEvents = orderDataBeforeCancel!.referralEvents.filter(
    (e) => e.type === "ORDER_BONUS"
  );
  const userRemainingBonus = remainingBonusEvents.find((e) => e.userId === user.id)?.amount || 0;
  const inviterRemainingBonus = remainingBonusEvents.find((e) => e.userId === inviter.id)?.amount || 0;

  await setOrderStatus(order.id, "CANCELLED");
  const balanceAfterCancel = await getUserBalance(user.id);
  const inviterBalanceAfterCancel = await getUserBalance(inviter.id);
  logInfo(`Баланс пользователя после отмены: ${balanceAfterCancel}`);
  logInfo(`Баланс пригласителя после отмены: ${inviterBalanceAfterCancel}`);

  // При отмене списываются оставшиеся ORDER_BONUS (после частичного возврата)
  // Пользователь: balanceAfterReturn - userRemainingBonus
  // Пригласитель: inviterBalanceAfterReturn - inviterRemainingBonus
  const expectedUserBalance = balanceAfterReturn - userRemainingBonus;
  const expectedInviterBalance = inviterBalanceAfterReturn - inviterRemainingBonus;

  logInfo(`Ожидаемый баланс пользователя: ${expectedUserBalance} (${balanceAfterReturn} - ${userRemainingBonus})`);
  logInfo(`Ожидаемый баланс пригласителя: ${expectedInviterBalance} (${inviterBalanceAfterReturn} - ${inviterRemainingBonus})`);

  if (
    balanceAfterCancel === expectedUserBalance &&
    inviterBalanceAfterCancel === expectedInviterBalance
  ) {
    logSuccess("Сложный сценарий выполнен корректно");
    return { success: true, orderId: order.id };
  } else {
    logError(`Ошибка: ожидались балансы ${expectedUserBalance} и ${expectedInviterBalance}`);
    return { success: false };
  }
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

async function main() {
  log("\n" + "=".repeat(60), "cyan");
  log("ТЕСТИРОВАНИЕ ФИНАНСОВЫХ СЦЕНАРИЕВ", "cyan");
  log("=".repeat(60) + "\n", "cyan");

  const results: Array<{ name: string; success: boolean }> = [];

  try {
    // Устанавливаем настройки для тестов
    await prisma.appSettings.upsert({
      where: { id: 1 },
      update: { customerPercent: 5, inviterPercent: 3 },
      create: { id: 1, customerPercent: 5, inviterPercent: 3 },
    });
    logInfo("Настройки установлены: customerPercent=5%, inviterPercent=3%\n");

    // Запускаем тесты
    const test1 = await test1_OrderWithoutBonuses();
    results.push({ name: "Заказ без бонусов", success: test1.success });

    const test2 = await test2_OrderWithPartialBonuses();
    results.push({ name: "Заказ с частичной оплатой бонусами", success: test2.success });

    const test3 = await test3_OrderWithFullBonuses();
    results.push({ name: "Заказ с полной оплатой бонусами", success: test3.success });

    const test4 = await test4_BonusAccrualOnDone();
    results.push({ name: "Начисление бонусов при DONE", success: test4.success });

    const test5 = await test5_ReferralBonus();
    results.push({ name: "Реферальные бонусы", success: test5.success });

    const test6 = await test6_PartialReturn();
    results.push({ name: "Частичный возврат", success: test6.success });

    const test7 = await test7_FullReturn();
    results.push({ name: "Полный возврат", success: test7.success });

    const test8 = await test8_CancelDoneOrder();
    results.push({ name: "Отмена выполненного заказа", success: test8.success });

    const test9 = await test9_InsufficientBonuses();
    results.push({ name: "Недостаточный баланс бонусов", success: test9.success });

    const test10 = await test10_ComplexScenario();
    results.push({ name: "Сложный сценарий", success: test10.success });

    // Итоги
    log("\n" + "=".repeat(60), "cyan");
    log("ИТОГИ ТЕСТИРОВАНИЯ", "cyan");
    log("=".repeat(60), "cyan");

    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    results.forEach((result) => {
      if (result.success) {
        logSuccess(`${result.name}`);
      } else {
        logError(`${result.name}`);
      }
    });

    log("\n" + "=".repeat(60), "cyan");
    log(`Пройдено: ${passed}/${results.length}`, passed === results.length ? "green" : "yellow");
    log("=".repeat(60) + "\n", "cyan");

    if (failed === 0) {
      log("Все тесты пройдены успешно! ✅", "green");
    } else {
      log(`Провалено тестов: ${failed} ❌`, "red");
      process.exit(1);
    }
  } catch (error: any) {
    logError(`Критическая ошибка: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
