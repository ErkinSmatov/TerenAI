const dayMs = 24 * 60 * 60 * 1000;

/**
 * Границы локальных суток по смещению часового пояса.
 *
 * Воспроизводит математику, уже проверенную в convex/glucose/getWeekReadings.ts,
 * обобщённую для новых observer-запросов (планы 03+), чтобы не появлялась
 * ещё одна копия той же математики. Существующие недельные запросы
 * (getWeekMeals, getWeekReadings, getWeekMovement) этот helper НЕ используют —
 * они не рефакторятся в рамках этой фазы.
 */
export function localDayBoundaries(
  nowMs: number,
  timezoneOffsetMinutes: number
): { startUtc: number; endUtc: number; dateString: string } {
  const offsetMs = timezoneOffsetMinutes * 60_000;
  const localNowMs = nowMs - offsetMs;
  const localMidnightMs = Math.floor(localNowMs / dayMs) * dayMs;
  const startUtc = localMidnightMs + offsetMs;
  const endUtc = startUtc + dayMs;
  const dateString = new Date(localMidnightMs).toISOString().slice(0, 10);

  return { startUtc, endUtc, dateString };
}
