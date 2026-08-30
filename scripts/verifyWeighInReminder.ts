import assert from "node:assert/strict";
import {
  DAY_MS,
  isWeighInDue,
} from "@/lib/notifications/reminderSchedule";

// Europe/Berlin летнее время (CEST, UTC+2) → timezoneOffsetMinutes = -120
// по конвенции Date.getTimezoneOffset(). Локальные 10:10 — это 08:10 UTC,
// локальные 03:00 — это 01:00 UTC.
const OFFSET_SUMMER = -120;

const IN_WINDOW_UTC = Date.UTC(2026, 7, 25, 8, 10, 0); // локально 10:10
const OUTSIDE_WINDOW_UTC = Date.UTC(2026, 7, 25, 1, 0, 0); // локально 03:00

// 1. Вес не обновлялся 8 дней (> 7-дневного интервала), сейчас в окне 10:10
// и напоминание раньше не отправлялось → должно сработать.
assert.strictEqual(
  isWeighInDue({
    nowUtcMs: IN_WINDOW_UTC,
    timezoneOffsetMinutes: OFFSET_SUMMER,
    weightUpdatedAtMs: IN_WINDOW_UTC - 8 * DAY_MS,
  }),
  true
);

// 2. Те же данные, но сейчас локальные 03:00 — вне окна 10:00-10:30 → false.
assert.strictEqual(
  isWeighInDue({
    nowUtcMs: OUTSIDE_WINDOW_UTC,
    timezoneOffsetMinutes: OFFSET_SUMMER,
    weightUpdatedAtMs: OUTSIDE_WINDOW_UTC - 8 * DAY_MS,
  }),
  false
);

// 3. Вес обновлён всего 2 дня назад (< 7 дней) — рано напоминать, хотя окно
// подходящее → false.
assert.strictEqual(
  isWeighInDue({
    nowUtcMs: IN_WINDOW_UTC,
    timezoneOffsetMinutes: OFFSET_SUMMER,
    weightUpdatedAtMs: IN_WINDOW_UTC - 2 * DAY_MS,
  }),
  false
);

// 4. Вес устарел (8 дней), но напоминание уже отправлялось 2 дня назад —
// раз в неделю, а не ежедневное давление (D-06) → false.
assert.strictEqual(
  isWeighInDue({
    nowUtcMs: IN_WINDOW_UTC,
    timezoneOffsetMinutes: OFFSET_SUMMER,
    weightUpdatedAtMs: IN_WINDOW_UTC - 8 * DAY_MS,
    lastReminderSentAtMs: IN_WINDOW_UTC - 2 * DAY_MS,
  }),
  false
);

// 5. Вес устарел, и предыдущее напоминание отправлялось 8 дней назад (>= 7
// дней) — пора напомнить снова → true.
assert.strictEqual(
  isWeighInDue({
    nowUtcMs: IN_WINDOW_UTC,
    timezoneOffsetMinutes: OFFSET_SUMMER,
    weightUpdatedAtMs: IN_WINDOW_UTC - 8 * DAY_MS,
    lastReminderSentAtMs: IN_WINDOW_UTC - 8 * DAY_MS,
  }),
  true
);

console.log("verifyWeighInReminder: OK");
