import assert from "node:assert/strict";
import { computeStreakFromMealTimes } from "@/convex/utils/streakDays";

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

console.log("verifyStreakDays: OK");
