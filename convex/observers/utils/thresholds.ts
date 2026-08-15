export type GlucoseContext =
  | "fasting"
  | "beforeMeal"
  | "afterMeal"
  | "random";

export type GlucoseUnit = "mmol/L" | "mg/dL";

/**
 * Референсные диапазоны нормы глюкозы (ADA Standards of Care).
 * Для контекста `random` используется общий референсный диапазон,
 * а не отдельная клиническая цель ADA (у ADA нет цели именно для
 * произвольного измерения вне приёма пищи/натощак).
 */
export const GLUCOSE_RANGES: Record<
  GlucoseContext,
  Record<GlucoseUnit, [number, number]>
> = {
  fasting: {
    "mg/dL": [80, 130],
    "mmol/L": [4.4, 7.2],
  },
  beforeMeal: {
    "mg/dL": [80, 130],
    "mmol/L": [4.4, 7.2],
  },
  afterMeal: {
    "mg/dL": [70, 180],
    "mmol/L": [3.9, 10.0],
  },
  random: {
    "mg/dL": [70, 140],
    "mmol/L": [3.9, 7.8],
  },
};

export function isGlucoseOutOfRange(
  value: number,
  unit: GlucoseUnit,
  context: GlucoseContext | undefined
): boolean {
  const resolvedContext = context ?? "random";
  const [low, high] = GLUCOSE_RANGES[resolvedContext][unit];
  return value < low || value > high;
}

export function isCaloriesExceeded(
  totalCalories: number,
  targetCalories: number
): boolean {
  return totalCalories > targetCalories;
}
