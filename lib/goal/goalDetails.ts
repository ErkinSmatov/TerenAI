import type { OnboardingData } from "@/context/OnboardingContext";

type GoalDetailsInput = Pick<
  OnboardingData,
  "goal" | "weight" | "targetWeight" | "weightChangeRate"
>;

// Синхронизировать с OnboardingWeightChangeRate (minKg, maxKg, defaultKg).
const MIN_RATE_KG = 0.1;
const MAX_RATE_KG = 1.5;
const DEFAULT_RATE_KG = 0.5;

// Границы пикера из OnboardingTargetWeight; шаг от текущего веса, чтобы
// пикер не стартовал на значении, равном текущему весу.
const TARGET_OFFSET_KG = 1;
const MIN_TARGET_KG = 30;
const MAX_TARGET_KG = 300;

// Синхронизировать с lib/units/kgToLbs.ts.
const KG_TO_LBS = 2.20462;

const round1 = (value: number) => Math.round(value * 10) / 10;

export function needsGoalDetails(input: GoalDetailsInput): boolean {
  const { goal, weight, targetWeight, weightChangeRate } = input;
  if (goal !== "lose" && goal !== "gain") return false;
  if (weightChangeRate <= 0) return true;
  if (goal === "lose") return targetWeight >= weight;
  return targetWeight <= weight;
}

export function normalizeGoalDetails(input: GoalDetailsInput): {
  targetWeight: number;
  weightChangeRate: number;
} {
  const { goal, weight, targetWeight, weightChangeRate } = input;
  if (goal === undefined) return { targetWeight, weightChangeRate };
  if (goal === "maintain") return { targetWeight: weight, weightChangeRate: 0 };

  const validSide =
    goal === "lose" ? targetWeight < weight : targetWeight > weight;
  let nextTarget = targetWeight;
  if (!validSide) {
    nextTarget =
      goal === "lose"
        ? Math.max(MIN_TARGET_KG, round1(weight - TARGET_OFFSET_KG))
        : Math.min(MAX_TARGET_KG, round1(weight + TARGET_OFFSET_KG));
  }

  const nextRate =
    weightChangeRate <= 0
      ? DEFAULT_RATE_KG
      : Math.min(MAX_RATE_KG, Math.max(MIN_RATE_KG, weightChangeRate));

  return { targetWeight: nextTarget, weightChangeRate: nextRate };
}

function formatNumber(value: number): string {
  return String(round1(value)).replace(".", ",");
}

export function formatGoalSummary(
  input: Pick<
    OnboardingData,
    | "goal"
    | "weight"
    | "targetWeight"
    | "weightChangeRate"
    | "measurementSystem"
  >,
): string {
  const { goal } = input;
  if (goal === undefined) return "Цель не выбрана";
  if (goal === "maintain") return "Цель: поддерживать вес";

  const verb = goal === "lose" ? "похудеть" : "набрать";
  if (needsGoalDetails(input)) return `Цель: ${verb}`;

  const imperial = input.measurementSystem === "imperial";
  const factor = imperial ? KG_TO_LBS : 1;
  const unit = imperial ? "lbs" : "кг";
  const target = formatNumber(input.targetWeight * factor);
  const rate = formatNumber(input.weightChangeRate * factor);
  return `Цель: ${verb} до ${target} ${unit}, ${rate} ${unit}/нед`;
}
