// Физиологические диапазоны измерений. Чистый модуль без React и Convex:
// его используют и экраны ввода, и Convex-мутации.

// Локальный тип, чтобы модуль не тянул convex/_generated
export type HealthGlucoseUnit = "mmol/L" | "mg/dL";

export type HealthRange = { min: number; max: number };

export const GLUCOSE_RANGES: Record<HealthGlucoseUnit, HealthRange> = {
  "mmol/L": { min: 1.1, max: 33.3 },
  "mg/dL": { min: 20, max: 600 },
};

export const GLUCOSE_UNIT_LABELS: Record<HealthGlucoseUnit, string> = {
  "mmol/L": "ммоль/л",
  "mg/dL": "мг/дл",
};

export const SYSTOLIC_RANGE: HealthRange = { min: 50, max: 300 };
export const DIASTOLIC_RANGE: HealthRange = { min: 30, max: 200 };
export const PULSE_RANGE: HealthRange = { min: 20, max: 250 };

// Границы включительно; NaN и Infinity недопустимы
export function isInRange(value: number, range: HealthRange): boolean {
  return Number.isFinite(value) && value >= range.min && value <= range.max;
}

export function isGlucoseValueValid(
  value: number,
  unit: HealthGlucoseUnit
): boolean {
  return isInRange(value, GLUCOSE_RANGES[unit]);
}

export function getGlucoseRangeError(
  value: number,
  unit: HealthGlucoseUnit
): string | null {
  if (isGlucoseValueValid(value, unit)) return null;
  const { min, max } = GLUCOSE_RANGES[unit];
  return `Значение вне допустимого диапазона: ${String(min)}–${String(max)} ${GLUCOSE_UNIT_LABELS[unit]}`;
}

export type BloodPressureInput = {
  systolic: number;
  diastolic: number;
  pulse?: number;
};

export function getBloodPressureError(input: BloodPressureInput): string | null {
  const { systolic, diastolic, pulse } = input;
  if (!isInRange(systolic, SYSTOLIC_RANGE)) {
    return `Систолическое давление вне диапазона: ${String(SYSTOLIC_RANGE.min)}–${String(SYSTOLIC_RANGE.max)} мм рт. ст.`;
  }
  if (!isInRange(diastolic, DIASTOLIC_RANGE)) {
    return `Диастолическое давление вне диапазона: ${String(DIASTOLIC_RANGE.min)}–${String(DIASTOLIC_RANGE.max)} мм рт. ст.`;
  }
  if (systolic <= diastolic) {
    return "Систолическое давление должно быть больше диастолического";
  }
  if (pulse !== undefined && !isInRange(pulse, PULSE_RANGE)) {
    return `Пульс вне диапазона: ${String(PULSE_RANGE.min)}–${String(PULSE_RANGE.max)} уд/мин`;
  }
  return null;
}

export function isBloodPressureValid(input: BloodPressureInput): boolean {
  return getBloodPressureError(input) === null;
}
