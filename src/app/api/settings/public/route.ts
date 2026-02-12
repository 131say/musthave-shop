import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

/**
 * Публичный API для получения настроек, доступных всем пользователям
 * Используется для отображения информации о бонусах в чекауте
 */
export async function GET() {
  try {
    const settings = await getSettings();
    
    // Возвращаем только публичные настройки (без админских данных)
    return NextResponse.json({
      ok: true,
      bonusPercent: settings.customerPercent, // процент бонусов для покупателя
    });
  } catch (e) {
    console.error("GET /api/settings/public error:", e);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
