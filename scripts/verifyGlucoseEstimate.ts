import assert from "node:assert/strict";
import estimateGlucoseFromMeals, {
  EstimateMealInput,
  EstimateReadingInput,
} from "@/lib/nutrition/estimateGlucoseFromMeals";
import { isGlucoseOutOfRange } from "@/convex/observers/utils/thresholds";

// Скрипт не зависит от таймзоны — вся математика ведётся на числовых
// метках времени, префикс TZ= здесь не нужен (в отличие от месячного
// скрипта, который раскладывает записи по локальному календарю).
const NOW = Date.UTC(2026, 7, 25, 12, 0, 0);
const MINUTE_MS = 60 * 1000;

function mealAt(
  minutesAgo: number,
  carbs: { total: number; sugar: number; fiber: number }
): EstimateMealInput {
  return {
    _creationTime: NOW - minutesAgo * MINUTE_MS,
    totalNutrients: { carbs },
  };
}

// 1. Пусто → null.
assert.strictEqual(estimateGlucoseFromMeals([], [], NOW), null);

// 2. Вне окна → null.
assert.strictEqual(
  estimateGlucoseFromMeals(
    [mealAt(240, { total: 60, sugar: 48, fiber: 0 })],
    [],
    NOW
  ),
  null
);

// 3. Блюдо без углеводов → null.
assert.strictEqual(
  estimateGlucoseFromMeals(
    [mealAt(30, { total: 0, sugar: 0, fiber: 0 })],
    [],
    NOW
  ),
  null
);

// 4. Опорное значение сладкого блюда (пик, 60 минут назад).
const sweetMeal = mealAt(60, { total: 60, sugar: 48, fiber: 0 });
const estimate4 = estimateGlucoseFromMeals([sweetMeal], [], NOW);
assert.ok(estimate4 !== null);
assert.strictEqual(estimate4.value, 8.1);
assert.strictEqual(estimate4.unit, "mmol/L");
assert.strictEqual(estimate4.mealCount, 1);

// 5. Клетчатка снижает оценку — то же количество углеводов, но с клетчаткой.
const fiberMeal = mealAt(60, { total: 60, sugar: 6, fiber: 18 });
const estimate5 = estimateGlucoseFromMeals([fiberMeal], [], NOW);
assert.ok(estimate5 !== null);
assert.strictEqual(estimate5.value, 6.6);
// 6.6 < 8.1: клетчатка доказуемо снижает оценку относительно проверки 4.

// 6. Монотонность кривой: пик на 60-й минуте выше, чем на 30-й и 150-й.
const at30 = estimateGlucoseFromMeals(
  [mealAt(30, { total: 60, sugar: 48, fiber: 0 })],
  [],
  NOW
);
const at60 = estimateGlucoseFromMeals(
  [mealAt(60, { total: 60, sugar: 48, fiber: 0 })],
  [],
  NOW
);
const at150 = estimateGlucoseFromMeals(
  [mealAt(150, { total: 60, sugar: 48, fiber: 0 })],
  [],
  NOW
);
assert.ok(at30 !== null && at60 !== null && at150 !== null);
assert.ok(at60.value > at30.value);
assert.ok(at60.value > at150.value);

// 7. Граница окна — ровно 180-я минута → null.
assert.strictEqual(
  estimateGlucoseFromMeals(
    [mealAt(180, { total: 60, sugar: 48, fiber: 0 })],
    [],
    NOW
  ),
  null
);

// 8. Разрешение единиц из последнего реального измерения.
const unitReading: EstimateReadingInput = {
  value: 100,
  unit: "mg/dL",
  recordedAt: NOW - 60 * MINUTE_MS,
  context: "random",
};
const estimate8 = estimateGlucoseFromMeals([sweetMeal], [unitReading], NOW);
assert.ok(estimate8 !== null);
assert.strictEqual(estimate8.unit, "mg/dL");
assert.strictEqual(Number.isInteger(estimate8.value), true);

// 9. База отсчёта строится из собственных fasting/beforeMeal показаний
//    пользователя, а не из показаний afterMeal.
const DAY_MS = 24 * 60 * 60 * 1000;
const fastingReadings: EstimateReadingInput[] = [
  { value: 6.0, unit: "mmol/L", recordedAt: NOW - 2 * DAY_MS, context: "fasting" },
  { value: 6.4, unit: "mmol/L", recordedAt: NOW - 5 * DAY_MS, context: "beforeMeal" },
];
const estimate9a = estimateGlucoseFromMeals(
  [sweetMeal],
  fastingReadings,
  NOW
);
assert.ok(estimate9a !== null);
assert.strictEqual(estimate9a.value, 8.8);

const afterMealReading: EstimateReadingInput = {
  value: 12.0,
  unit: "mmol/L",
  recordedAt: NOW - DAY_MS,
  context: "afterMeal",
};
const estimate9b = estimateGlucoseFromMeals(
  [sweetMeal],
  [...fastingReadings, afterMealReading],
  NOW
);
assert.ok(estimate9b !== null);
assert.strictEqual(estimate9b.value, estimate9a.value);

// 10. Правило D-08 (fallback-предупреждение): пороговая логика берётся из
//     thresholds.ts, а не переизобретается в этом модуле.
assert.strictEqual(isGlucoseOutOfRange(8.1, "mmol/L", "random"), true);
assert.strictEqual(isGlucoseOutOfRange(8.1, "mmol/L", "afterMeal"), false);

console.log("verifyGlucoseEstimate: OK");
