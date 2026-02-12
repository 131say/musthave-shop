/**
 * Сервис уведомлений через WhatsApp
 * 
 * Бизнес-логика отправки уведомлений:
 * - OTP коды
 * - Уведомления о заказах
 * - Уведомления о бонусах
 */

import { sendWhatsAppTemplate, formatPhoneToE164 } from "./whatsapp";

/**
 * Отправляет OTP код через WhatsApp
 */
export async function sendOtp(phone: string, code: string): Promise<boolean> {
  const templateName = process.env.WHATSAPP_TEMPLATE_OTP_NAME || "otp_login_code";
  const phoneE164 = formatPhoneToE164(phone);
  
  const result = await sendWhatsAppTemplate(phoneE164, templateName, [
    code,        // {{1}} - код
    "5",         // {{2}} - время действия в минутах
  ]);

  if (!result.success) {
    console.error(`[NOTIFICATIONS] Failed to send OTP to ${phoneE164}:`, result.error);
  }

  return result.success;
}

/**
 * Уведомление о создании заказа
 */
export async function notifyOrderCreated(order: {
  id: number;
  customerPhone: string;
}): Promise<boolean> {
  const templateName = process.env.WHATSAPP_TEMPLATE_ORDER_CREATED_NAME || "order_created";
  const phoneE164 = formatPhoneToE164(order.customerPhone);
  
  // Используем id как номер заказа (если есть order.number - можно добавить позже)
  const orderNumber = String(order.id);
  
  const result = await sendWhatsAppTemplate(phoneE164, templateName, [
    orderNumber, // {{1}} - номер заказа
  ]);

  if (!result.success) {
    console.error(`[NOTIFICATIONS] Failed to send order created notification to ${phoneE164}:`, result.error);
  }

  return result.success;
}

/**
 * Уведомление о подтверждении оплаты
 */
export async function notifyOrderPaid(order: {
  id: number;
  customerPhone: string;
}): Promise<boolean> {
  const templateName = process.env.WHATSAPP_TEMPLATE_ORDER_PAID_NAME || "order_paid";
  const phoneE164 = formatPhoneToE164(order.customerPhone);
  
  // Используем id как номер заказа (если есть order.number - можно добавить позже)
  const orderNumber = String(order.id);
  
  const result = await sendWhatsAppTemplate(phoneE164, templateName, [
    orderNumber, // {{1}} - номер заказа
  ]);

  if (!result.success) {
    console.error(`[NOTIFICATIONS] Failed to send order paid notification to ${phoneE164}:`, result.error);
  }

  return result.success;
}

/**
 * Уведомление о начислении бонусов за заказ
 */
export async function notifyOrderBonus(order: {
  id: number;
  customerPhone: string;
}, bonusAmount: number): Promise<boolean> {
  const templateName = process.env.WHATSAPP_TEMPLATE_ORDER_DONE_BONUS_NAME || "order_bonus_credited";
  const phoneE164 = formatPhoneToE164(order.customerPhone);
  
  // Используем id как номер заказа (если есть order.number - можно добавить позже)
  const orderNumber = String(order.id);
  
  const result = await sendWhatsAppTemplate(phoneE164, templateName, [
    String(bonusAmount), // {{1}} - сумма бонусов
    orderNumber,         // {{2}} - номер заказа
  ]);

  if (!result.success) {
    console.error(`[NOTIFICATIONS] Failed to send order bonus notification to ${phoneE164}:`, result.error);
  }

  return result.success;
}

/**
 * Уведомление о начислении реферальных бонусов (1 уровень - прямые рефералы)
 */
export async function notifyReferralBonus(
  userPhone: string,
  bonusAmount: number,
  referredUserName?: string
): Promise<boolean> {
  const templateName = process.env.WHATSAPP_TEMPLATE_REF_BONUS_NAME || "referral_bonus_credited";
  const phoneE164 = formatPhoneToE164(userPhone);
  
  const result = await sendWhatsAppTemplate(phoneE164, templateName, [
    referredUserName || "друг", // {{1}} - имя реферала (если есть)
    String(bonusAmount),        // {{2}} - сумма бонусов
  ]);

  if (!result.success) {
    console.error(`[NOTIFICATIONS] Failed to send referral bonus notification to ${phoneE164}:`, result.error);
  }

  return result.success;
}

/**
 * Уведомление о начислении бонусов за команду (2 уровень)
 */
export async function notifyTeamBonus(
  userPhone: string,
  bonusAmount: number,
  orderNumber: string
): Promise<boolean> {
  const templateName = process.env.WHATSAPP_TEMPLATE_TEAM_BONUS_NAME || "team_bonus_credited";
  const phoneE164 = formatPhoneToE164(userPhone);
  
  const result = await sendWhatsAppTemplate(phoneE164, templateName, [
    String(bonusAmount), // {{1}} - сумма бонусов
    orderNumber,         // {{2}} - номер заказа
  ]);

  if (!result.success) {
    console.error(`[NOTIFICATIONS] Failed to send team bonus notification to ${phoneE164}:`, result.error);
  }

  return result.success;
}

/**
 * Уведомление об открытии 2 уровня (команда)
 */
export async function notifyLevel2Unlocked(userPhone: string): Promise<boolean> {
  const templateName = process.env.WHATSAPP_TEMPLATE_LEVEL2_UNLOCKED_NAME || "level2_unlocked";
  const phoneE164 = formatPhoneToE164(userPhone);
  
  const result = await sendWhatsAppTemplate(phoneE164, templateName, []);

  if (!result.success) {
    console.error(`[NOTIFICATIONS] Failed to send level 2 unlocked notification to ${phoneE164}:`, result.error);
  }

  return result.success;
}
