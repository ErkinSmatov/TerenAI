import assert from "node:assert/strict";
import {
  getLocalParts,
  resolveDueMealPoint,
} from "@/lib/notifications/reminderSchedule";

// Скрипт требует TZ=Europe/Berlin (см. package.json script:verifyMealReminderWindows).
// Тест не читает process.env.TZ напрямую — таймзона нужна только для
// человекочитаемых комментариев по датам ниже; вся арифметика ведётся через
// явный timezoneOffsetMinutes, как и в проверяемом модуле.

const OFFSET_SUMMER = -120; // Europe/Berlin, CEST (UTC+2), 25 августа 2026
const OFFSET_WINTER = -60; // Europe/Berlin, CET (UTC+1), 15 января 2026
const HOUR_MS = 60 * 60 * 1000;

// 1. Точка "breakfast" (9:00-9:30): локально 9:05 → utc 7:05.
const breakfastUtc = Date.UTC(2026, 7, 25, 7, 5, 0);
const breakfastResult = resolveDueMealPoint({
  nowUtcMs: breakfastUtc,
  timezoneOffsetMinutes: OFFSET_SUMMER,
});
assert.ok(breakfastResult !== null);
assert.strictEqual(breakfastResult.id, "breakfast");
const breakfastLocalParts = getLocalParts(breakfastUtc, OFFSET_SUMMER);
// windowStartUtcMs для breakfast = начало локальных суток (нет предыдущей точки).
assert.strictEqual(
  breakfastResult.windowStartUtcMs,
  breakfastLocalParts.localDayStartUtcMs
);
assert.strictEqual(
  breakfastResult.windowEndUtcMs,
  breakfastLocalParts.localDayStartUtcMs + 9 * HOUR_MS
);

// 2. Точка "lunch" (14:00-14:30): локально 14:10 → utc 12:10.
const lunchUtc = Date.UTC(2026, 7, 25, 12, 10, 0);
const lunchResult = resolveDueMealPoint({
  nowUtcMs: lunchUtc,
  timezoneOffsetMinutes: OFFSET_SUMMER,
});
assert.ok(lunchResult !== null);
assert.strictEqual(lunchResult.id, "lunch");
const lunchLocalParts = getLocalParts(lunchUtc, OFFSET_SUMMER);
assert.strictEqual(
  lunchResult.windowStartUtcMs,
  lunchLocalParts.localDayStartUtcMs + 9 * HOUR_MS
);
assert.strictEqual(
  lunchResult.windowEndUtcMs,
  lunchLocalParts.localDayStartUtcMs + 14 * HOUR_MS
);

// 3. Точка "dinner" (20:00-20:30): локально 20:15 → utc 18:15.
const dinnerUtc = Date.UTC(2026, 7, 25, 18, 15, 0);
const dinnerResult = resolveDueMealPoint({
  nowUtcMs: dinnerUtc,
  timezoneOffsetMinutes: OFFSET_SUMMER,
});
assert.ok(dinnerResult !== null);
assert.strictEqual(dinnerResult.id, "dinner");
const dinnerLocalParts = getLocalParts(dinnerUtc, OFFSET_SUMMER);
// windowStartUtcMs для dinner = локальные 14:00 (конец точки lunch).
assert.strictEqual(
  dinnerResult.windowStartUtcMs,
  dinnerLocalParts.localDayStartUtcMs + 14 * HOUR_MS
);
assert.strictEqual(
  dinnerResult.windowEndUtcMs,
  dinnerLocalParts.localDayStartUtcMs + 20 * HOUR_MS
);

// 4. Между точками (локально 12:00, между lunch и предыдущим) → null.
const betweenUtc = Date.UTC(2026, 7, 25, 10, 0, 0);
assert.strictEqual(
  resolveDueMealPoint({
    nowUtcMs: betweenUtc,
    timezoneOffsetMinutes: OFFSET_SUMMER,
  }),
  null
);

// 5. Границы окна: ровно hour:00 → точка есть, hour:30 → уже null.
const exactHourUtc = Date.UTC(2026, 7, 25, 7, 0, 0); // локально 9:00 ровно
const exactResult = resolveDueMealPoint({
  nowUtcMs: exactHourUtc,
  timezoneOffsetMinutes: OFFSET_SUMMER,
});
assert.ok(exactResult !== null);
assert.strictEqual(exactResult.id, "breakfast");

const halfHourUtc = Date.UTC(2026, 7, 25, 7, 30, 0); // локально 9:30 ровно
assert.strictEqual(
  resolveDueMealPoint({
    nowUtcMs: halfHourUtc,
    timezoneOffsetMinutes: OFFSET_SUMMER,
  }),
  null
);

// 6. DST-кейс: та же календарная точка 9:00 при летнем (-120) и зимнем (-60)
// смещении даёт разные UTC-моменты, но одинаковый minutesSinceLocalMidnight.
const winterBreakfastUtc = Date.UTC(2026, 0, 15, 8, 0, 0); // локально 9:00 зимой
const summerParts = getLocalParts(exactHourUtc, OFFSET_SUMMER);
const winterParts = getLocalParts(winterBreakfastUtc, OFFSET_WINTER);
assert.strictEqual(
  summerParts.minutesSinceLocalMidnight,
  winterParts.minutesSinceLocalMidnight
);
assert.notStrictEqual(exactHourUtc, winterBreakfastUtc);

const winterBreakfastResult = resolveDueMealPoint({
  nowUtcMs: winterBreakfastUtc,
  timezoneOffsetMinutes: OFFSET_WINTER,
});
assert.ok(winterBreakfastResult !== null);
assert.strictEqual(winterBreakfastResult.id, "breakfast");
assert.strictEqual(
  winterBreakfastResult.windowStartUtcMs,
  winterParts.localDayStartUtcMs
);

console.log("verifyMealReminderWindows: OK");
