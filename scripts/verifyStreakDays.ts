import assert from "node:assert/strict";
import { computeStreakFromMealTimes } from "@/convex/utils/streakDays";
import { getMealTime } from "@/lib/meals/getMealTime";

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;

// Опорная точка: 10 января 2026, полдень UTC.
const now = Date.UTC(2026, 0, 10, 12, 0, 0);

// Пустой массив -> 0.
assert.strictEqual(computeStreakFromMealTimes([], now, 0), 0);

// Одно блюдо сегодня -> 1.
assert.strictEqual(computeStreakFromMealTimes([now], now, 0), 1);

// Одно блюдо позавчера -> 0 (серия оборвана, старт не сегодня/не вчера).
assert.strictEqual(
  computeStreakFromMealTimes([now - 2 * dayMs], now, 0),
  0
);

// Три дня подряд, заканчивая вчера -> 3.
assert.strictEqual(
  computeStreakFromMealTimes(
    [now - dayMs, now - 2 * dayMs, now - 3 * dayMs],
    now,
    0
  ),
  3
);

// Два блюда в одних сутках не увеличивают счётчик.
assert.strictEqual(
  computeStreakFromMealTimes([now, now - hourMs], now, 0),
  1
);

// Разрыв в середине обрывает серию: 5 дней с пропуском на третьем -> 2.
assert.strictEqual(
  computeStreakFromMealTimes(
    [now - dayMs, now - 2 * dayMs, now - 4 * dayMs, now - 5 * dayMs],
    now,
    0
  ),
  2
);

// Ненулевое timezoneOffsetMinutes сдвигает границу суток: блюдо в 23:30 UTC
// при timezoneOffsetMinutes=-120 (локаль UTC+2) относится к следующим
// локальным суткам ("сегодня", а не отдельным "вчера").
const now2 = Date.UTC(2026, 0, 10, 0, 30, 0); // 10 января, 00:30 UTC
const meal2330Utc = now2 - hourMs; // 9 января, 23:30 UTC

assert.strictEqual(
  computeStreakFromMealTimes([now2, meal2330Utc], now2, -120),
  1
);
assert.strictEqual(
  computeStreakFromMealTimes([now2, meal2330Utc], now2, 0),
  2
);

// фаза 71: время по eatenAt, порядок desc. Вчерашний ужин добавлен задним
// числом (создан позже сегодняшнего блюда), но по eatenAt он вчерашний.
const backfilled = [
  { _creationTime: now - 3 * hourMs, eatenAt: now - 3 * hourMs }, // сегодня
  { _creationTime: now - hourMs, eatenAt: now - dayMs }, // вчера, добавлено задним числом
  { _creationTime: now - 2 * hourMs, eatenAt: now - 2 * dayMs }, // позавчера
];
const byEatenAtDesc = backfilled
  .map(getMealTime)
  .sort((a, b) => b - a);
assert.strictEqual(computeStreakFromMealTimes(byEatenAtDesc, now, 0), 3);

// Порядок по _creationTime desc (без сортировки по eatenAt) даёт массив не в
// убывающем порядке; после сортировки по eatenAt desc результат тот же: 3.
const byCreationDesc = [...backfilled]
  .sort((a, b) => b._creationTime - a._creationTime)
  .map(getMealTime)
  .sort((a, b) => b - a);
assert.strictEqual(computeStreakFromMealTimes(byCreationDesc, now, 0), 3);

console.log("verifyStreakDays: OK");
