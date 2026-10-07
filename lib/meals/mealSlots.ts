// Чистый модуль без зависимостей от convex/react/react-native — импортируется
// и клиентом, и ts-node verify-скриптами.
//
// Дефолтные часы слотов совпадают с точками напоминаний (D-08).
import { MEAL_REMINDER_POINTS } from "@/lib/notifications/reminderSchedule";

export type MealSlotId = "breakfast" | "lunch" | "dinner" | "other";

const SLOT_LABELS: Record<Exclude<MealSlotId, "other">, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
};

export const MEAL_SLOTS: { id: MealSlotId; label: string; hour: number }[] =
  MEAL_REMINDER_POINTS.map((p) => ({
    id: p.id,
    label: SLOT_LABELS[p.id],
    hour: p.hour,
  }));

// Порядок = порядок сегментов.
export const MEAL_SLOT_LABELS: string[] = [
  "Завтрак",
  "Обед",
  "Ужин",
  "Другое",
];

export const MEAL_SLOT_IDS: MealSlotId[] = [
  "breakfast",
  "lunch",
  "dinner",
  "other",
];

// Сценарий «забыл записать ужин».
export const DEFAULT_BACKFILL_SLOT: MealSlotId = "dinner";

export function getSlotHour(slot: Exclude<MealSlotId, "other">): number {
  const found = MEAL_SLOTS.find((s) => s.id === slot);
  if (!found) throw new Error(`Unknown slot: ${slot}`);
  return found.hour;
}

// Локальные компоненты → переход на летнее время разрешается корректно.
export function buildEatenAt(
  target: Date,
  hour: number,
  minute: number
): number {
  return new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    hour,
    minute
  ).getTime();
}

// Штрихкод без пикера: время «сейчас» на выбранном дне, не позже now.
export function getDefaultBarcodeEatenAt(target: Date, now: number): number {
  const nowDate = new Date(now);
  return Math.min(
    buildEatenAt(target, nowDate.getHours(), nowDate.getMinutes()),
    now
  );
}
