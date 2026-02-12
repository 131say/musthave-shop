import { getSettings } from "@/lib/settings";

export function calcSlotPrice(slotNumber: number, base: number, step: number) {
  if (slotNumber <= 1) return 0;
  const n = Math.max(2, Math.floor(slotNumber));
  return Math.max(0, Math.round(base + step * (n - 2)));
}

export async function getNextSlotPriceForUser(slotsTotal: number) {
  const s = await getSettings();
  const nextSlotNumber = Math.max(2, Math.floor((slotsTotal ?? 1) + 1));
  const price = calcSlotPrice(nextSlotNumber, s.slotBaseBonus, s.slotStepBonus);
  return { nextSlotNumber, price, base: s.slotBaseBonus, step: s.slotStepBonus };
}






