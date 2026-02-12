/**
 * WhatsApp Cloud API адаптер
 * 
 * Отправка шаблонов через Meta WhatsApp Business Cloud API
 * Документация: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

/**
 * Форматирует номер телефона в E.164 формат (+7XXXXXXXXXX)
 */
export function formatPhoneToE164(phone: string): string {
  // Убираем все нецифровые символы
  const digits = phone.replace(/\D/g, "");
  
  // Если номер начинается с 7 или 8 (Казахстан/Россия), добавляем +
  if (digits.startsWith("7")) {
    return `+${digits}`;
  }
  if (digits.startsWith("8")) {
    return `+7${digits.slice(1)}`;
  }
  
  // Если номер уже в формате +7, возвращаем как есть
  if (phone.startsWith("+")) {
    return phone;
  }
  
  // Если номер начинается с других цифр, добавляем +7 (по умолчанию для Казахстана)
  if (digits.length >= 10) {
    return `+7${digits.slice(-10)}`;
  }
  
  // Если ничего не подошло, возвращаем как есть с +
  return `+${digits}`;
}

/**
 * Отправляет WhatsApp шаблон через Cloud API
 * 
 * @param toPhoneE164 - номер получателя в формате E.164 (+7XXXXXXXXXX)
 * @param templateName - название шаблона (например, "otp_login_code")
 * @param params - массив параметров для подстановки в шаблон
 * @returns Promise с результатом отправки
 */
export async function sendWhatsAppTemplate(
  toPhoneE164: string,
  templateName: string,
  params: string[] = []
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

  if (!phoneNumberId || !accessToken) {
    console.error("[WHATSAPP] Missing required environment variables");
    return {
      success: false,
      error: "WhatsApp configuration missing",
    };
  }

  // В DEV режиме выводим в консоль вместо реальной отправки
  if (process.env.NODE_ENV === "development") {
    console.log(`[WHATSAPP] Template: ${templateName}`);
    console.log(`[WHATSAPP] To: ${toPhoneE164}`);
    console.log(`[WHATSAPP] Params:`, params);
    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    
    const body = {
      messaging_product: "whatsapp",
      to: toPhoneE164,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "ru",
        },
        components: params.length > 0 ? [
          {
            type: "body",
            parameters: params.map((param) => ({
              type: "text",
              text: param,
            })),
          },
        ] : undefined,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(`[WHATSAPP] API error:`, data);
      return {
        success: false,
        error: data?.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (error: any) {
    console.error("[WHATSAPP] Send error:", error);
    return {
      success: false,
      error: error?.message || "Unknown error",
    };
  }
}
