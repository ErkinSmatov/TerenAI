import assert from "node:assert/strict";
import getLocalMonthBounds from "@/lib/utils/getLocalMonthBounds";
import {
  assertLocalMonthBounds,
  assertLocalMonthDates,
  getLocalMonthDayIndex,
} from "@/convex/utils/localMonthBounds";

const HOUR_MS = 60 * 60 * 1000;

// Октябрь 2026 в зоне Europe/Berlin: в ночь на воскресенье 25 октября 2026
// переводят стрелки назад с CEST (+2) на CET (+1) — тот же переход, что
// использует scripts/verifyWeekBucketing.ts. Скрипт обязан выполняться с
// TZ=Europe/Berlin, иначе значения не сойдутся.
const { dayStartsUtc, monthDates } = getLocalMonthBounds(
  new Date(2026, 9, 15, 12, 0, 0)
);

assert.strictEqual(dayStartsUtc.length, 32);
assert.strictEqual(monthDates.length, 31);
assert.strictEqual(monthDates[0], "2026-10-01");
assert.strictEqual(monthDates[30], "2026-10-31");

// Oct 1 = index 0, значит Oct 25 = index 24, Oct 26 = index 25.
// Шаг через переход — между полуночью 25-го и полуночью 26-го, 25 часов,
// а не 24. Прямое доказательство, что переход учтён. Соседний (предыдущий)
// шаг остаётся 24-часовым.
assert.strictEqual(dayStartsUtc[25] - dayStartsUtc[24], 25 * HOUR_MS);
assert.strictEqual(dayStartsUtc[24] - dayStartsUtc[23], 24 * HOUR_MS);

// Февраль невисокосного 2027 года.
const feb2027 = getLocalMonthBounds(new Date(2027, 1, 10));
assert.strictEqual(feb2027.monthDates.length, 28);
assert.strictEqual(feb2027.dayStartsUtc.length, 29);
assert.strictEqual(feb2027.monthDates[27], "2027-02-28");

// Февраль високосного 2028 года.
const feb2028 = getLocalMonthBounds(new Date(2028, 1, 10));
assert.strictEqual(feb2028.monthDates.length, 29);
assert.strictEqual(feb2028.dayStartsUtc.length, 30);
assert.strictEqual(feb2028.monthDates[28], "2028-02-29");

// Индексация по октябрьским границам.
assert.strictEqual(getLocalMonthDayIndex(dayStartsUtc, dayStartsUtc[0]), 0);
assert.strictEqual(
  getLocalMonthDayIndex(dayStartsUtc, dayStartsUtc[0] - 1),
  -1
);
assert.strictEqual(
  getLocalMonthDayIndex(dayStartsUtc, dayStartsUtc[dayStartsUtc.length - 1]),
  -1
);
// 25 октября 23:30 по местному времени, уже после перевода стрелок (CET,
// +1). Должно попасть в индекс 24 (25-е число месяца), а не выпасть из
// месяца.
assert.strictEqual(
  getLocalMonthDayIndex(dayStartsUtc, Date.parse("2026-10-25T22:30:00.000Z")),
  24
);

// Отказ валидатора границ.
assert.throws(() => {
  assertLocalMonthBounds(dayStartsUtc.slice(0, 20));
});
assert.throws(() => {
  assertLocalMonthBounds([...dayStartsUtc].reverse());
});
assert.throws(() => {
  assertLocalMonthBounds(dayStartsUtc.map((ms, i) => ms + i * 24 * HOUR_MS));
});
assert.throws(() => {
  // Массив шире одного месяца (T-68-04) — сцепляем октябрь с ещё одним
  // корректным шагом, получая длину 33.
  assertLocalMonthBounds([
    ...dayStartsUtc,
    dayStartsUtc[dayStartsUtc.length - 1] + 24 * HOUR_MS,
  ]);
});
assert.doesNotThrow(() => {
  assertLocalMonthBounds(dayStartsUtc);
});

// Отказ валидатора дат.
assert.throws(() => {
  assertLocalMonthDates(monthDates.slice(0, 20));
});
assert.throws(() => {
  assertLocalMonthDates(["2026-1-01", ...monthDates.slice(1)]);
});
assert.throws(() => {
  // Пропущенный день в середине месяца — разрыв непрерывности.
  assertLocalMonthDates([...monthDates.slice(0, 15), ...monthDates.slice(16)]);
});
assert.doesNotThrow(() => {
  assertLocalMonthDates(monthDates);
});

console.log("verifyMonthBucketing: OK");
