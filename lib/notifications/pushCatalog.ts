// Чистый модуль без зависимостей от convex/react/react-native — каталог новых
// push-уведомлений. Тексты скопированы дословно из
// docs/TEREN_Push_Notifications.xlsx (лист «Уведомления»).

import type { MealPointId } from "@/lib/notifications/reminderSchedule";
import type { PushClass } from "@/lib/notifications/pushRules";

export type ScheduledPushId =
  | "FOOD-01"
  | "HLT-14"
  | "RET-01"
  | "RET-02"
  | "RET-03";

export type PushId = ScheduledPushId | "OBS-01";

export const PUSH_CATALOG: Record<
  PushId,
  { pushClass: PushClass; title: string; texts: string[]; url: string }
> = {
  // Класс B (расписание) — в лимит C/D не входит.
  "FOOD-01": {
    pushClass: "B",
    title: "Всё в порядке?",
    texts: [
      "Вы обычно едите в это время. Всё в порядке? 🙂",
      "{имя}, сейчас ваше обычное время {приём_р}. Если уже поели — отметьте в дневнике 🍽",
      // Только для завтрака.
      "Доброе утро! Завтрак в первый час после подъёма помогает держать сахар ровнее ☀️",
    ],
    url: "/app",
  },
  "HLT-14": {
    pushClass: "B",
    title: "Вес за неделю",
    texts: [
      "Пора внести вес за неделю. Лучше утром, до завтрака ⚖️",
      "Недельное взвешивание: это займёт полминуты ⚖️",
    ],
    url: "/app/(settings)/weeklyWeighIn",
  },
  // Класс D (поддержка) — входят в лимит 3 в сутки.
  "RET-01": {
    pushClass: "D",
    title: "Мы на месте",
    texts: [
      "{имя}, давно вас не было. Сфотографируйте сегодняшний приём пищи, остальное мы возьмём на себя 👋",
    ],
    url: "/app",
  },
  "RET-02": {
    pushClass: "D",
    title: "Все данные сохранены",
    texts: ["Мы на месте. Данные сохранены, продолжить можно с любого места 🙂"],
    url: "/app",
  },
  "RET-03": {
    pushClass: "D",
    title: "Не будем отвлекать",
    texts: [
      "Не будем вас отвлекать. Когда захотите вернуться — всё будет на месте 💚",
    ],
    url: "/app",
  },
  // Класс A — транзакционный: не входит в лимит C/D и в тумблеры напоминаний.
  // Отправляется из convex/observers/redeemCode.ts. Имя наблюдателя в текст
  // не подставляется (экран блокировки, медицинский контекст).
  "OBS-01": {
    pushClass: "A",
    title: "Запрос на наблюдение",
    texts: [
      "Кто-то хочет наблюдать за вашими данными. Откройте приложение, чтобы ответить 🔔",
    ],
    url: "/app/(tabs)/maps",
  },
};

// Лист «Переменные»: {приём_р} — родительный падеж.
export const MEAL_GENITIVE: Record<MealPointId, string> = {
  breakfast: "завтрака",
  lunch: "обеда",
  dinner: "ужина",
};

// Текст 3 FOOD-01 — только для завтрака.
export function getFoodReminderVariantIndexes(pointId: MealPointId): number[] {
  return pointId === "breakfast" ? [0, 1, 2] : [0, 1];
}

export function renderPushText(
  template: string,
  vars: { name?: string | null; mealPointId?: MealPointId }
): string {
  const firstName = vars.name?.trim().split(/\s+/)[0];

  let result: string;
  if (firstName) {
    result = template.split("{имя}").join(firstName);
  } else {
    // «Если имени нет — убрать обращение».
    result = template.split("{имя}, ").join("").split("{имя}").join("");
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  if (vars.mealPointId) {
    result = result.split("{приём_р}").join(MEAL_GENITIVE[vars.mealPointId]);
  }

  return result;
}
