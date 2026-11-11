import assert from "node:assert/strict";

import {
  getBloodPressureError,
  getGlucoseRangeError,
  isBloodPressureValid,
  isGlucoseValueValid,
} from "../lib/health/healthRanges";

// Сахар, ммоль/л
for (const v of [1.1, 33.3, 5.5]) assert.equal(isGlucoseValueValid(v, "mmol/L"), true);
for (const v of [1.0, 33.4, 80, 0, -5, NaN, Infinity]) {
  assert.equal(isGlucoseValueValid(v, "mmol/L"), false);
}

// Сахар, мг/дл
for (const v of [20, 600, 100]) assert.equal(isGlucoseValueValid(v, "mg/dL"), true);
for (const v of [19, 601, 0, -1, NaN, Infinity]) {
  assert.equal(isGlucoseValueValid(v, "mg/dL"), false);
}

assert.equal(
  getGlucoseRangeError(80, "mmol/L"),
  "Значение вне допустимого диапазона: 1.1–33.3 ммоль/л"
);
assert.equal(
  getGlucoseRangeError(601, "mg/dL"),
  "Значение вне допустимого диапазона: 20–600 мг/дл"
);
assert.equal(getGlucoseRangeError(5, "mmol/L"), null);

// Давление
assert.equal(isBloodPressureValid({ systolic: 120, diastolic: 80 }), true);
assert.equal(isBloodPressureValid({ systolic: 50, diastolic: 40 }), true);
assert.equal(isBloodPressureValid({ systolic: 300, diastolic: 200 }), true);
assert.equal(isBloodPressureValid({ systolic: 49, diastolic: 30 }), false);
assert.equal(isBloodPressureValid({ systolic: 301, diastolic: 80 }), false);
assert.equal(isBloodPressureValid({ systolic: 120, diastolic: 30 }), true);
assert.equal(isBloodPressureValid({ systolic: 120, diastolic: 29 }), false);
assert.equal(isBloodPressureValid({ systolic: 250, diastolic: 201 }), false);
assert.equal(isBloodPressureValid({ systolic: 120, diastolic: 120 }), false);
assert.equal(isBloodPressureValid({ systolic: 100, diastolic: 110 }), false);
assert.equal(isBloodPressureValid({ systolic: NaN, diastolic: 80 }), false);

// Пульс
assert.equal(isBloodPressureValid({ systolic: 120, diastolic: 80, pulse: undefined }), true);
assert.equal(isBloodPressureValid({ systolic: 120, diastolic: 80, pulse: 20 }), true);
assert.equal(isBloodPressureValid({ systolic: 120, diastolic: 80, pulse: 250 }), true);
assert.equal(isBloodPressureValid({ systolic: 120, diastolic: 80, pulse: 19 }), false);
assert.equal(isBloodPressureValid({ systolic: 120, diastolic: 80, pulse: 251 }), false);
assert.equal(isBloodPressureValid({ systolic: 120, diastolic: 80, pulse: NaN }), false);

// Сообщения
assert.equal(getBloodPressureError({ systolic: 120, diastolic: 80 }), null);
assert.equal(
  getBloodPressureError({ systolic: 400, diastolic: 80 }),
  "Систолическое давление вне диапазона: 50–300 мм рт. ст."
);
assert.equal(
  getBloodPressureError({ systolic: 120, diastolic: 10 }),
  "Диастолическое давление вне диапазона: 30–200 мм рт. ст."
);
assert.equal(
  getBloodPressureError({ systolic: 100, diastolic: 110 }),
  "Систолическое давление должно быть больше диастолического"
);
assert.equal(
  getBloodPressureError({ systolic: 120, diastolic: 80, pulse: 5 }),
  "Пульс вне диапазона: 20–250 уд/мин"
);

console.log("verifyHealthRanges: OK");
