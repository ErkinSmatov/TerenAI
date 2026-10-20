// Проверка чистых функций цели без тестового фреймворка.
// Запуск: node --experimental-strip-types --no-warnings scripts/checks/goal.check.mjs
import assert from "node:assert/strict";

const {
  needsGoalDetails: needs,
  normalizeGoalDetails: norm,
  formatGoalSummary: fmt,
} = await import("../../lib/goal/goalDetails.ts");

const base = { weight: 80, targetWeight: 70, weightChangeRate: 0.5 };

assert.equal(needs({ ...base, goal: "maintain", weightChangeRate: 0 }), false);
assert.equal(needs({ ...base, goal: "lose" }), false);
assert.equal(
  needs({ ...base, goal: "lose", targetWeight: 80, weightChangeRate: 0 }),
  true,
);
assert.equal(needs({ ...base, goal: "gain" }), true);
assert.equal(needs({ ...base, goal: "lose", weightChangeRate: 0 }), true);
assert.equal(needs({ ...base, goal: undefined }), false);

assert.deepEqual(norm({ ...base, goal: "gain", weightChangeRate: 0 }), {
  targetWeight: 81,
  weightChangeRate: 0.5,
});
assert.deepEqual(
  norm({ ...base, goal: "lose", targetWeight: 80, weightChangeRate: 0 }),
  { targetWeight: 79, weightChangeRate: 0.5 },
);
assert.deepEqual(
  norm({ goal: "lose", weight: 30.5, targetWeight: 40, weightChangeRate: 0.5 }),
  { targetWeight: 30, weightChangeRate: 0.5 },
);
assert.deepEqual(
  norm({ ...base, goal: "lose", targetWeight: 72, weightChangeRate: 0.3 }),
  { targetWeight: 72, weightChangeRate: 0.3 },
);
assert.deepEqual(norm({ ...base, goal: "maintain" }), {
  targetWeight: 80,
  weightChangeRate: 0,
});
assert.equal(
  norm({ ...base, goal: "lose", weightChangeRate: 2 }).weightChangeRate,
  1.5,
);

const metric = { ...base, measurementSystem: "metric" };
assert.equal(
  fmt({ ...metric, goal: "lose" }),
  "Цель: похудеть до 70 кг, 0,5 кг/нед",
);
assert.equal(
  fmt({
    ...metric,
    goal: "gain",
    weight: 60,
    targetWeight: 65.5,
    weightChangeRate: 0.25,
  }),
  "Цель: набрать до 65,5 кг, 0,3 кг/нед",
);
assert.equal(fmt({ ...metric, goal: "maintain" }), "Цель: поддерживать вес");
assert.equal(
  fmt({ ...metric, goal: "lose", measurementSystem: "imperial" }),
  "Цель: похудеть до 154,3 lbs, 1,1 lbs/нед",
);
assert.equal(
  fmt({ ...metric, goal: "lose", targetWeight: 80, weightChangeRate: 0 }),
  "Цель: похудеть",
);

console.log("goal: OK");
