import { getMealTime } from "@/lib/meals/getMealTime";
import type { GlucoseContext, GlucoseUnit } from "@/convex/observers/utils/thresholds";

/**
 * Приблизительная оценка уровня глюкозы по недавно съеденным блюдам.
 *
 * Важные ограничения этой модели, которые нельзя терять из вида:
 * (а) `estimatedGI` — это прокси-гликемический индекс, а не настоящий GI
 *     продукта: в схеме проекта нигде не хранится GI, и готового
 *     машиночитаемого источника GI не существует (проверено в RESEARCH.md).
 *     Прокси строится из соотношения сахара и клетчатки в углеводах блюда —
 *     чем выше доля сахара и ниже доля клетчатки, тем резче предполагаемый
 *     подъём.
 * (б) Формула `GL = GI * carbs / 100` (гликемическая нагрузка) — стандартная
 *     и цитируемая величина; подстановка прокси-GI вместо настоящего GI —
 *     нет, это упрощение конкретно этого проекта.
 * (в) Константы кривой подъёма/спада (пик на 60-й минуте, возврат к базе на
 *     180-й) — общие ориентиры по типичной кинетике усвоения углеводов, а не
 *     клинические данные конкретного пользователя.
 * (г) Поэтому итоговая величина — это оценка «≈», а не измерение, и обязана
 *     подаваться в UI со знаком «≈» и не выдаваться за реальное показание
 *     глюкометра/CGM.
 *
 * Файл — чистый модуль без импортов React Native, Expo-роутера и
 * Convex-хуков, а также без генерируемых серверных типов (`Doc<...>`),
 * чтобы его мог напрямую запускать ad-hoc ts-node-скрипт (тот же принцип,
 * что у `convex/utils/localWeekBounds.ts`). Функция ничего не пишет и не
 * читает из таблицы реальных показаний глюкозы — она принципиально не
 * персистит оценку, чтобы не смешать её с реальными измерениями в
 * недельных/месячных запросах, PDF-отчёте и экранах наблюдателя.
 */

export type EstimateMealInput = {
  _creationTime: number;
  eatenAt?: number;
  totalNutrients?: {
    carbs: { total: number; fiber: number; sugar: number };
  };
};

export type EstimateReadingInput = {
  value: number;
  unit: GlucoseUnit;
  recordedAt: number;
  context?: GlucoseContext;
};

export type GlucoseEstimate = {
  value: number;
  unit: GlucoseUnit;
  mealCount: number;
};

export const GLUCOSE_ESTIMATE_CONSTANTS = {
  MGDL_PER_MMOL: 18,
  BASELINE_MMOL: 5.5,
  GI_BASE: 35,
  GI_SUGAR_WEIGHT: 55,
  GI_FIBER_WEIGHT: 25,
  GI_MIN: 15,
  GI_MAX: 100,
  PEAK_MINUTES: 60,
  WINDOW_MINUTES: 180,
  MMOL_PER_GL_UNIT: 0.055,
  BASELINE_LOOKBACK_MS: 14 * 24 * 60 * 60 * 1000,
  UNIT_LOOKBACK_MS: 30 * 24 * 60 * 60 * 1000,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toMmol(value: number, unit: GlucoseUnit): number {
  return unit === "mg/dL" ? value / GLUCOSE_ESTIMATE_CONSTANTS.MGDL_PER_MMOL : value;
}

function resolveTargetUnit(
  readings: EstimateReadingInput[],
  now: number
): GlucoseUnit {
  let latest: EstimateReadingInput | null = null;
  for (const reading of readings) {
    if (now - reading.recordedAt > GLUCOSE_ESTIMATE_CONSTANTS.UNIT_LOOKBACK_MS) {
      continue;
    }
    if (!latest || reading.recordedAt > latest.recordedAt) {
      latest = reading;
    }
  }
  return latest ? latest.unit : "mmol/L";
}

function resolveBaselineMmol(
  readings: EstimateReadingInput[],
  now: number
): number {
  const relevant = readings.filter(
    (reading) =>
      (reading.context === "fasting" || reading.context === "beforeMeal") &&
      now - reading.recordedAt <= GLUCOSE_ESTIMATE_CONSTANTS.BASELINE_LOOKBACK_MS
  );

  if (relevant.length === 0) {
    return GLUCOSE_ESTIMATE_CONSTANTS.BASELINE_MMOL;
  }

  const sum = relevant.reduce(
    (acc, reading) => acc + toMmol(reading.value, reading.unit),
    0
  );
  return sum / relevant.length;
}

export default function estimateGlucoseFromMeals(
  meals: EstimateMealInput[],
  readings: EstimateReadingInput[],
  now: number
): GlucoseEstimate | null {
  const {
    GI_BASE,
    GI_SUGAR_WEIGHT,
    GI_FIBER_WEIGHT,
    GI_MIN,
    GI_MAX,
    PEAK_MINUTES,
    WINDOW_MINUTES,
    MMOL_PER_GL_UNIT,
    MGDL_PER_MMOL,
  } = GLUCOSE_ESTIMATE_CONSTANTS;

  const targetUnit = resolveTargetUnit(readings, now);
  const baselineMmol = resolveBaselineMmol(readings, now);

  let loadSum = 0;
  let mealCount = 0;

  for (const meal of meals) {
    const carbs = meal.totalNutrients?.carbs;
    if (!carbs || carbs.total <= 0) {
      continue;
    }

    const minutesSinceMeal = (now - getMealTime(meal)) / 60000;
    if (minutesSinceMeal < 0 || minutesSinceMeal >= WINDOW_MINUTES) {
      continue;
    }

    const sugarRatio = carbs.sugar / Math.max(carbs.total, 1);
    const fiberRatio = carbs.fiber / Math.max(carbs.total, 1);
    const estimatedGI = clamp(
      GI_BASE + GI_SUGAR_WEIGHT * sugarRatio - GI_FIBER_WEIGHT * fiberRatio,
      GI_MIN,
      GI_MAX
    );
    const glycemicLoad = (estimatedGI * carbs.total) / 100;

    const weight =
      minutesSinceMeal <= PEAK_MINUTES
        ? minutesSinceMeal / PEAK_MINUTES
        : Math.max(
            0,
            1 - (minutesSinceMeal - PEAK_MINUTES) / (WINDOW_MINUTES - PEAK_MINUTES)
          );

    const contribution = glycemicLoad * weight;
    if (contribution > 0) {
      loadSum += contribution;
      mealCount += 1;
    }
  }

  if (loadSum <= 0) {
    return null;
  }

  const valueMmol = baselineMmol + loadSum * MMOL_PER_GL_UNIT;

  const value =
    targetUnit === "mmol/L"
      ? Math.round(valueMmol * 10) / 10
      : Math.round(valueMmol * MGDL_PER_MMOL);

  return { value, unit: targetUnit, mealCount };
}
