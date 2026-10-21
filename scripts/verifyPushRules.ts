import assert from "node:assert/strict";
import { DAY_MS } from "@/lib/notifications/reminderSchedule";
import {
  DORMANT_AFTER_MS,
  canSendWithDailyLimit,
  incrementDailyCounter,
  isDormant,
  isInLocalSlot,
  isLocalSunday,
  isQuietHours,
  isWeeklyWeighInDue,
  pickRotatedTextIndex,
  resolveRetentionStage,
  validatePushCopy,
} from "@/lib/notifications/pushRules";
import {
  PUSH_CATALOG,
  getFoodReminderVariantIndexes,
  renderPushText,
  type PushId,
} from "@/lib/notifications/pushCatalog";

// Конвенция: timezoneOffsetMinutes = Date.getTimezoneOffset().
// Europe/Berlin летом (CEST, UTC+2) → -120.
const OFFSET_SUMMER = -120;

// ---------------------------------------------------------------------------
// isQuietHours (правило 3: 22:00–08:00)
// ---------------------------------------------------------------------------
// Берём 2026-08-25 (вторник). При offset 0 локальное = UTC.
const at = (h: number, m: number, day = 25) =>
  Date.UTC(2026, 7, day, h, m, 0);

assert.strictEqual(isQuietHours(at(22, 0), 0), true);
assert.strictEqual(isQuietHours(at(23, 59), 0), true);
assert.strictEqual(isQuietHours(at(0, 0), 0), true);
assert.strictEqual(isQuietHours(at(7, 59), 0), true);
assert.strictEqual(isQuietHours(at(8, 0), 0), false);
assert.strictEqual(isQuietHours(at(12, 0), 0), false);
assert.strictEqual(isQuietHours(at(21, 59), 0), false);

// offset -120: локальное = UTC + 2 часа.
assert.strictEqual(isQuietHours(at(20, 0), OFFSET_SUMMER), true); // 22:00
assert.strictEqual(isQuietHours(at(21, 59), OFFSET_SUMMER), true); // 23:59
assert.strictEqual(isQuietHours(at(22, 0), OFFSET_SUMMER), true); // 00:00
assert.strictEqual(isQuietHours(at(5, 59), OFFSET_SUMMER), true); // 07:59
assert.strictEqual(isQuietHours(at(6, 0), OFFSET_SUMMER), false); // 08:00
assert.strictEqual(isQuietHours(at(10, 0), OFFSET_SUMMER), false); // 12:00
assert.strictEqual(isQuietHours(at(19, 59), OFFSET_SUMMER), false); // 21:59

// ---------------------------------------------------------------------------
// canSendWithDailyLimit / incrementDailyCounter (правило 2)
// ---------------------------------------------------------------------------
const dayStart = Date.UTC(2026, 7, 25, 0, 0, 0);

assert.strictEqual(canSendWithDailyLimit(undefined, dayStart, 3), true);
assert.strictEqual(
  canSendWithDailyLimit({ dayStartUtcMs: dayStart, count: 3 }, dayStart, 3),
  false
);
assert.strictEqual(
  canSendWithDailyLimit({ dayStartUtcMs: dayStart, count: 2 }, dayStart, 3),
  true
);
assert.strictEqual(
  canSendWithDailyLimit(
    { dayStartUtcMs: dayStart - DAY_MS, count: 3 },
    dayStart,
    3
  ),
  true
);

assert.deepStrictEqual(incrementDailyCounter(undefined, dayStart), {
  dayStartUtcMs: dayStart,
  count: 1,
});
assert.deepStrictEqual(
  incrementDailyCounter({ dayStartUtcMs: dayStart, count: 1 }, dayStart),
  { dayStartUtcMs: dayStart, count: 2 }
);
assert.deepStrictEqual(
  incrementDailyCounter(
    { dayStartUtcMs: dayStart - DAY_MS, count: 5 },
    dayStart
  ),
  { dayStartUtcMs: dayStart, count: 1 }
);

// ---------------------------------------------------------------------------
// pickRotatedTextIndex (правило 11)
// ---------------------------------------------------------------------------
assert.strictEqual(pickRotatedTextIndex([0, 1, 2], undefined), 0);
assert.strictEqual(pickRotatedTextIndex([0, 1, 2], 0), 1);
assert.strictEqual(pickRotatedTextIndex([0, 1, 2], 1), 2);
assert.strictEqual(pickRotatedTextIndex([0, 1, 2], 2), 0);
assert.strictEqual(pickRotatedTextIndex([0, 1], 2), 0);
assert.strictEqual(pickRotatedTextIndex([0, 1], 1), 0);
assert.strictEqual(pickRotatedTextIndex([0], 0), 0);
for (const allowed of [[0, 1], [0, 1, 2]]) {
  for (const last of [undefined, 0, 1, 2]) {
    const next = pickRotatedTextIndex(allowed, last);
    assert.notStrictEqual(next, last);
    assert.ok(allowed.includes(next));
  }
}

// ---------------------------------------------------------------------------
// isInLocalSlot
// ---------------------------------------------------------------------------
assert.strictEqual(isInLocalSlot(at(12, 0), 0, 12), true);
assert.strictEqual(isInLocalSlot(at(12, 29), 0, 12), true);
assert.strictEqual(isInLocalSlot(at(11, 59), 0, 12), false);
assert.strictEqual(isInLocalSlot(at(12, 30), 0, 12), false);
assert.strictEqual(isInLocalSlot(at(10, 5), OFFSET_SUMMER, 12), true);

// ---------------------------------------------------------------------------
// isLocalSunday
// 2026-08-23 — воскресенье, 2026-08-22 — суббота, 2026-08-24 — понедельник.
// ---------------------------------------------------------------------------
assert.strictEqual(isLocalSunday(Date.UTC(2026, 7, 22, 23, 0, 0), -600), true);
assert.strictEqual(
  isLocalSunday(Date.UTC(2026, 7, 23, 8, 10, 0), OFFSET_SUMMER),
  true
);
assert.strictEqual(
  isLocalSunday(Date.UTC(2026, 7, 24, 8, 10, 0), OFFSET_SUMMER),
  false
);

// ---------------------------------------------------------------------------
// isWeeklyWeighInDue
// ---------------------------------------------------------------------------
const SUNDAY_1010 = Date.UTC(2026, 7, 23, 8, 10, 0); // локально вс 10:10
const MONDAY_1010 = Date.UTC(2026, 7, 24, 8, 10, 0); // локально пн 10:10

assert.strictEqual(
  isWeeklyWeighInDue({
    nowUtcMs: SUNDAY_1010,
    timezoneOffsetMinutes: OFFSET_SUMMER,
    weightUpdatedAtMs: SUNDAY_1010 - 8 * DAY_MS,
  }),
  true
);
assert.strictEqual(
  isWeeklyWeighInDue({
    nowUtcMs: MONDAY_1010,
    timezoneOffsetMinutes: OFFSET_SUMMER,
    weightUpdatedAtMs: MONDAY_1010 - 8 * DAY_MS,
  }),
  false
);
assert.strictEqual(
  isWeeklyWeighInDue({
    nowUtcMs: SUNDAY_1010,
    timezoneOffsetMinutes: OFFSET_SUMMER,
    weightUpdatedAtMs: SUNDAY_1010 - 3 * DAY_MS,
  }),
  false
);
assert.strictEqual(
  isWeeklyWeighInDue({
    nowUtcMs: SUNDAY_1010,
    timezoneOffsetMinutes: OFFSET_SUMMER,
    weightUpdatedAtMs: SUNDAY_1010 - 8 * DAY_MS,
    lastReminderSentAtMs: SUNDAY_1010 - 6 * DAY_MS,
  }),
  false
);

// ---------------------------------------------------------------------------
// resolveRetentionStage / isDormant
// ---------------------------------------------------------------------------
const NOW = Date.UTC(2026, 7, 25, 10, 0, 0);
const lastActive = (days: number) => NOW - days * DAY_MS;

assert.strictEqual(
  resolveRetentionStage({ nowUtcMs: NOW, lastActiveAtMs: lastActive(2) }),
  null
);
assert.strictEqual(
  resolveRetentionStage({ nowUtcMs: NOW, lastActiveAtMs: lastActive(3) }),
  1
);
assert.strictEqual(
  resolveRetentionStage({
    nowUtcMs: NOW,
    lastActiveAtMs: lastActive(3),
    lastSentStage: 1,
    lastSentAtMs: NOW - 1000,
  }),
  null
);
assert.strictEqual(
  resolveRetentionStage({
    nowUtcMs: NOW,
    lastActiveAtMs: lastActive(7),
    lastSentStage: 1,
    lastSentAtMs: lastActive(4),
  }),
  2
);
assert.strictEqual(
  resolveRetentionStage({ nowUtcMs: NOW, lastActiveAtMs: lastActive(10) }),
  2
);
assert.strictEqual(
  resolveRetentionStage({
    nowUtcMs: NOW,
    lastActiveAtMs: lastActive(14),
    lastSentStage: 2,
    lastSentAtMs: lastActive(7),
  }),
  3
);
assert.strictEqual(
  resolveRetentionStage({
    nowUtcMs: NOW,
    lastActiveAtMs: lastActive(20),
    lastSentStage: 3,
    lastSentAtMs: lastActive(6),
  }),
  null
);
// Пользователь вернулся после stage 3 и снова пропал на 4 дня → снова stage 1.
assert.strictEqual(
  resolveRetentionStage({
    nowUtcMs: NOW,
    lastActiveAtMs: lastActive(4),
    lastSentStage: 3,
    lastSentAtMs: lastActive(30),
  }),
  1
);

assert.strictEqual(
  isDormant(NOW, NOW - (14 * DAY_MS - 60 * 60 * 1000)),
  false
);
assert.strictEqual(isDormant(NOW, NOW - DORMANT_AFTER_MS), true);
assert.strictEqual(isDormant(NOW, NOW - 14 * DAY_MS), true);

// ---------------------------------------------------------------------------
// validatePushCopy (правила 9, 10)
// ---------------------------------------------------------------------------
assert.strictEqual(validatePushCopy("Заголовок", "Текст 🙂").ok, true);
assert.strictEqual(validatePushCopy("а".repeat(40), "Текст 🙂").ok, true);
assert.strictEqual(validatePushCopy("а".repeat(41), "Текст 🙂").ok, false);
assert.strictEqual(
  validatePushCopy("Заголовок", "а".repeat(139) + "🙂").ok,
  true
);
assert.strictEqual(
  validatePushCopy("Заголовок", "а".repeat(140) + "🙂").ok,
  false
);
assert.strictEqual(validatePushCopy("Заголовок", "Текст без эмодзи").ok, false);
assert.strictEqual(validatePushCopy("Заголовок", "Текст 🙂 и 🍽").ok, false);
assert.strictEqual(validatePushCopy("Заголовок", "Текст 🙂 в середине").ok, false);
assert.strictEqual(validatePushCopy("Заголовок 🙂", "Текст 🙂").ok, false);

// ---------------------------------------------------------------------------
// renderPushText
// ---------------------------------------------------------------------------
const food = PUSH_CATALOG["FOOD-01"];
assert.strictEqual(
  renderPushText(food.texts[1], {
    name: "Айгерим Сапарова",
    mealPointId: "lunch",
  }),
  "Айгерим, сейчас ваше обычное время обеда. Если уже поели — отметьте в дневнике 🍽"
);
assert.strictEqual(
  renderPushText(food.texts[1], { name: null, mealPointId: "lunch" }),
  "Сейчас ваше обычное время обеда. Если уже поели — отметьте в дневнике 🍽"
);
assert.ok(
  renderPushText(PUSH_CATALOG["RET-01"].texts[0], { name: "  " }).startsWith(
    "Давно вас не было."
  )
);
assert.ok(
  !/[{}]/.test(
    renderPushText(PUSH_CATALOG["RET-01"].texts[0], { name: undefined })
  )
);
assert.ok(
  !/[{}]/.test(
    renderPushText(food.texts[1], { name: "Айгерим", mealPointId: "dinner" })
  )
);

assert.deepStrictEqual(getFoodReminderVariantIndexes("breakfast"), [0, 1, 2]);
assert.deepStrictEqual(getFoodReminderVariantIndexes("lunch"), [0, 1]);
assert.deepStrictEqual(getFoodReminderVariantIndexes("dinner"), [0, 1]);

// ---------------------------------------------------------------------------
// Весь каталог проходит валидацию копирайта
// ---------------------------------------------------------------------------
for (const id of Object.keys(PUSH_CATALOG) as PushId[]) {
  const entry = PUSH_CATALOG[id];
  assert.ok(entry.texts.length > 0, `${id}: нет текстов`);
  for (const text of entry.texts) {
    for (const name of [null, "Айгерим"]) {
      const result = validatePushCopy(
        entry.title,
        renderPushText(text, { name, mealPointId: "breakfast" })
      );
      assert.strictEqual(
        result.ok,
        true,
        `${id}: ${result.errors.join("; ")}`
      );
    }
  }
}

assert.strictEqual(PUSH_CATALOG["FOOD-01"].pushClass, "B");
assert.strictEqual(PUSH_CATALOG["HLT-14"].pushClass, "B");
assert.strictEqual(PUSH_CATALOG["RET-01"].pushClass, "D");
assert.strictEqual(PUSH_CATALOG["RET-02"].pushClass, "D");
assert.strictEqual(PUSH_CATALOG["RET-03"].pushClass, "D");

console.log("verifyPushRules: OK");
