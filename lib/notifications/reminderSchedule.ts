// Чистый модуль без зависимостей от convex/react/react-native — импортируется
// и Convex-действиями (планы 69-06/69-07), и ts-node verify-скриптами.
//
// Соглашение о часовом поясе повторяет convex/home/getStreak.ts:
// `timezoneOffsetMinutes` — результат `Date.getTimezoneOffset()`, поэтому
// `localMs = utcMs - timezoneOffsetMinutes * 60_000`.

export const DAY_MS = 24 * 60 * 60 * 1000;

// D-06: повторное напоминание о взвешивании — раз в 7 суток.
export const WEIGH_IN_INTERVAL_MS = 7 * DAY_MS;

// Напоминание о взвешивании шлётся только в окне 10:00–10:30 по локальному
// времени пользователя, чтобы push не приходил ночью.
export const WEIGH_IN_REMINDER_HOUR = 10;

// Равно интервалу cron-тика из плана 69-07.
export const MEAL_REMINDER_WINDOW_MINUTES = 30;

// Защита от повторной отправки на одну и ту же точку при дрейфе тика cron.
export const MEAL_REMINDER_DEDUPE_MS = 3 * 60 * 60 * 1000;

export type MealPointId = "breakfast" | "lunch" | "dinner";

// D-11, D-15: точки дня, для которых проверяется «уже поел ли пользователь».
export const MEAL_REMINDER_POINTS: { id: MealPointId; hour: number }[] = [
  { id: "breakfast", hour: 9 },
  { id: "lunch", hour: 14 },
  { id: "dinner", hour: 20 },
];

export function getLocalParts(
  nowUtcMs: number,
  timezoneOffsetMinutes: number
): { localDayStartUtcMs: number; minutesSinceLocalMidnight: number } {
  const offsetMs = timezoneOffsetMinutes * 60_000;
  const localMs = nowUtcMs - offsetMs;
  const localDayStartLocalMs = Math.floor(localMs / DAY_MS) * DAY_MS;

  return {
    localDayStartUtcMs: localDayStartLocalMs + offsetMs,
    minutesSinceLocalMidnight: Math.floor(
      (localMs - localDayStartLocalMs) / 60_000
    ),
  };
}

export function resolveDueMealPoint(input: {
  nowUtcMs: number;
  timezoneOffsetMinutes: number;
}): { id: MealPointId; windowStartUtcMs: number; windowEndUtcMs: number } | null {
  const { localDayStartUtcMs, minutesSinceLocalMidnight } = getLocalParts(
    input.nowUtcMs,
    input.timezoneOffsetMinutes
  );

  for (let i = 0; i < MEAL_REMINDER_POINTS.length; i++) {
    const point = MEAL_REMINDER_POINTS[i];
    const windowStartMinutes = point.hour * 60;
    const windowEndMinutes = windowStartMinutes + MEAL_REMINDER_WINDOW_MINUTES;

    if (
      minutesSinceLocalMidnight >= windowStartMinutes &&
      minutesSinceLocalMidnight < windowEndMinutes
    ) {
      // windowStartUtcMs — конец предыдущей точки (для breakfast — начало
      // локальных суток). Реализация трактовки D-12: в таблице meals нет
      // поля типа приёма пищи, «уже записан приём пищи» определяется
      // попаданием блюда во временное окно, а не классификацией.
      const previousPoint = i > 0 ? MEAL_REMINDER_POINTS[i - 1] : null;
      const windowStartUtcMs = previousPoint
        ? localDayStartUtcMs + previousPoint.hour * 60 * 60_000
        : localDayStartUtcMs;

      return {
        id: point.id,
        windowStartUtcMs,
        windowEndUtcMs: localDayStartUtcMs + point.hour * 60 * 60_000,
      };
    }
  }

  return null;
}

export function isWeighInDue(input: {
  nowUtcMs: number;
  timezoneOffsetMinutes: number;
  weightUpdatedAtMs: number;
  lastReminderSentAtMs?: number;
}): boolean {
  const { minutesSinceLocalMidnight } = getLocalParts(
    input.nowUtcMs,
    input.timezoneOffsetMinutes
  );

  const windowStartMinutes = WEIGH_IN_REMINDER_HOUR * 60;
  const windowEndMinutes = windowStartMinutes + MEAL_REMINDER_WINDOW_MINUTES;
  const inWindow =
    minutesSinceLocalMidnight >= windowStartMinutes &&
    minutesSinceLocalMidnight < windowEndMinutes;

  const weightStale =
    input.nowUtcMs - input.weightUpdatedAtMs >= WEIGH_IN_INTERVAL_MS;

  // D-06 «повторяется постоянно»: раз в неделю, а не ежедневное давление.
  const reminderDue =
    input.lastReminderSentAtMs === undefined ||
    input.nowUtcMs - input.lastReminderSentAtMs >= WEIGH_IN_INTERVAL_MS;

  return inWindow && weightStale && reminderDue;
}

export function isMealReminderDeduped(
  nowUtcMs: number,
  lastMealReminderSentAtMs?: number
): boolean {
  return (
    lastMealReminderSentAtMs !== undefined &&
    nowUtcMs - lastMealReminderSentAtMs < MEAL_REMINDER_DEDUPE_MS
  );
}
