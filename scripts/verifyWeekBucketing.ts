import assert from "node:assert/strict";
import getLocalWeekBounds from "@/lib/utils/getLocalWeekBounds";
import {
  assertLocalWeekBounds,
  assertLocalWeekDates,
  getLocalWeekDayIndex,
} from "@/convex/utils/localWeekBounds";

const HOUR_MS = 60 * 60 * 1000;

// Неделя 19-25 октября 2026 в зоне Europe/Berlin: в ночь на воскресенье
// 25 октября 2026 переводят стрелки назад с CEST (+2) на CET (+1).
// Скрипт обязан выполняться с TZ=Europe/Berlin, иначе значения не сойдутся.
const { dayStartsUtc, weekDates } = getLocalWeekBounds(
  new Date(2026, 9, 21, 12, 0, 0)
);

assert.deepStrictEqual(weekDates, [
  "2026-10-19",
  "2026-10-20",
  "2026-10-21",
  "2026-10-22",
  "2026-10-23",
  "2026-10-24",
  "2026-10-25",
]);

assert.strictEqual(dayStartsUtc.length, 8);
assert.strictEqual(
  new Date(dayStartsUtc[0]).toISOString(),
  "2026-10-18T22:00:00.000Z"
);
assert.strictEqual(
  new Date(dayStartsUtc[6]).toISOString(),
  "2026-10-24T22:00:00.000Z"
);
assert.strictEqual(
  new Date(dayStartsUtc[7]).toISOString(),
  "2026-10-25T23:00:00.000Z"
);

// Шаг через сам переход DST — 25 часов, а не 24. Прямое доказательство,
// что переход учтён.
assert.strictEqual(dayStartsUtc[7] - dayStartsUtc[6], 25 * HOUR_MS);
assert.strictEqual(dayStartsUtc[6] - dayStartsUtc[5], 24 * HOUR_MS);

// Воскресенье 23:30 по местному времени, уже после перевода стрелок.
// Старый алгоритм с единственным смещением -120 относил этот момент
// к индексу 7 и выбрасывал запись из недели — это утверждение фиксирует
// суть бага, который чинит этот план.
assert.strictEqual(
  getLocalWeekDayIndex(dayStartsUtc, Date.parse("2026-10-25T22:30:00.000Z")),
  6
);
// Воскресенье 01:30, ещё по летнему времени.
assert.strictEqual(
  getLocalWeekDayIndex(dayStartsUtc, Date.parse("2026-10-24T23:30:00.000Z")),
  6
);

assert.strictEqual(getLocalWeekDayIndex(dayStartsUtc, dayStartsUtc[0]), 0);
assert.strictEqual(getLocalWeekDayIndex(dayStartsUtc, dayStartsUtc[0] - 1), -1);
assert.strictEqual(getLocalWeekDayIndex(dayStartsUtc, dayStartsUtc[7]), -1);

assert.throws(() => {
  assertLocalWeekBounds(dayStartsUtc.slice(0, 7));
});
assert.throws(() => {
  assertLocalWeekBounds([...dayStartsUtc].reverse());
});
assert.throws(() => {
  assertLocalWeekBounds(dayStartsUtc.map((ms, i) => ms + i * 24 * HOUR_MS));
});
assert.doesNotThrow(() => {
  assertLocalWeekBounds(dayStartsUtc);
});

assert.throws(() => {
  assertLocalWeekDates(weekDates.slice(0, 6));
});
assert.throws(() => {
  assertLocalWeekDates(["2026-1-19", ...weekDates.slice(1)]);
});
assert.throws(() => {
  assertLocalWeekDates([...weekDates.slice(0, 6), "2026-10-26"]);
});
assert.doesNotThrow(() => {
  assertLocalWeekDates(weekDates);
});

console.log("verifyWeekBucketing: OK");
