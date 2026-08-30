import assert from "node:assert/strict";
import { resolveNewBadges } from "@/lib/badges/badgeDefinitions";

// 1. Ничего не достигнуто → пустой массив.
assert.deepStrictEqual(
  resolveNewBadges({ streak: 6, mealCount: 9, awarded: [] }),
  []
);

// 2. streak 7 → ровно один бейдж streak/7.
const streak7Result = resolveNewBadges({
  streak: 7,
  mealCount: 0,
  awarded: [],
});
assert.strictEqual(streak7Result.length, 1);
assert.strictEqual(streak7Result[0].type, "streak");
assert.strictEqual(streak7Result[0].threshold, 7);

// 3. streak 100 с пустым awarded → "догоняющее" начисление всех пройденных
// порогов стрика (7, 30, 100).
const streak100Result = resolveNewBadges({
  streak: 100,
  mealCount: 0,
  awarded: [],
});
assert.deepStrictEqual(
  streak100Result.map((badge) => badge.threshold),
  [7, 30, 100]
);
assert.ok(streak100Result.every((badge) => badge.type === "streak"));

// 4. mealCount 55 → два бейджа (10, 50).
const mealCount55Result = resolveNewBadges({
  streak: 0,
  mealCount: 55,
  awarded: [],
});
assert.deepStrictEqual(
  mealCount55Result.map((badge) => badge.threshold),
  [10, 50]
);
assert.ok(mealCount55Result.every((badge) => badge.type === "mealCount"));

// 5. Идемпотентность: результат первого вызова, добавленный в awarded,
// даёт пустой второй вызов (T-69-04).
const firstCallAwarded = mealCount55Result.map((badge) => ({
  type: badge.type,
  threshold: badge.threshold,
}));
const secondCallResult = resolveNewBadges({
  streak: 0,
  mealCount: 55,
  awarded: firstCallAwarded,
});
assert.strictEqual(secondCallResult.length, 0);

// 6. Смешанный случай: streak 30 + mealCount 100, часть уже выдана.
const mixedResult = resolveNewBadges({
  streak: 30,
  mealCount: 100,
  awarded: [{ type: "streak", threshold: 7 }],
});
assert.deepStrictEqual(
  mixedResult.map((badge) => `${badge.type}/${badge.threshold}`),
  ["streak/30", "mealCount/10", "mealCount/50", "mealCount/100"]
);

console.log("verifyBadgeThresholds: OK");
