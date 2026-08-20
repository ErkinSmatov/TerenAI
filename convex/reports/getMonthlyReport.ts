import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { isGlucoseOutOfRange } from "../observers/utils/thresholds";
import { Doc } from "../_generated/dataModel";

const dayMs = 24 * 60 * 60 * 1000;
const reportDays = 30;
const mgDlPerMmolL = 18.0182;

function toDateString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function toMmolL(value: number, unit: "mmol/L" | "mg/dL"): number {
  return unit === "mmol/L" ? value : value / mgDlPerMmolL;
}

type NutrientTotals = Doc<"meals">["totalNutrients"];

function addNutrientTotals(
  acc: NonNullable<NutrientTotals>,
  next: NonNullable<NutrientTotals>
): NonNullable<NutrientTotals> {
  return {
    carbs: {
      total: acc.carbs.total + next.carbs.total,
      net: acc.carbs.net + next.carbs.net,
      fiber: acc.carbs.fiber + next.carbs.fiber,
      sugar: acc.carbs.sugar + next.carbs.sugar,
    },
    fats: {
      total: acc.fats.total + next.fats.total,
      saturated: acc.fats.saturated + next.fats.saturated,
      monounsaturated: acc.fats.monounsaturated + next.fats.monounsaturated,
      polyunsaturated: acc.fats.polyunsaturated + next.fats.polyunsaturated,
      trans: acc.fats.trans + next.fats.trans,
      cholesterol: acc.fats.cholesterol + next.fats.cholesterol,
    },
    protein: {
      total: acc.protein.total + next.protein.total,
      leucine: acc.protein.leucine + next.protein.leucine,
      isoleucine: acc.protein.isoleucine + next.protein.isoleucine,
      valine: acc.protein.valine + next.protein.valine,
      tryptophan: acc.protein.tryptophan + next.protein.tryptophan,
    },
    vitamins: {
      a: acc.vitamins.a + next.vitamins.a,
      b12: acc.vitamins.b12 + next.vitamins.b12,
      b9: acc.vitamins.b9 + next.vitamins.b9,
      c: acc.vitamins.c + next.vitamins.c,
      d: acc.vitamins.d + next.vitamins.d,
      e: acc.vitamins.e + next.vitamins.e,
      k: acc.vitamins.k + next.vitamins.k,
    },
    minerals: {
      sodium: acc.minerals.sodium + next.minerals.sodium,
      potassium: acc.minerals.potassium + next.minerals.potassium,
      magnesium: acc.minerals.magnesium + next.minerals.magnesium,
      calcium: acc.minerals.calcium + next.minerals.calcium,
      iron: acc.minerals.iron + next.minerals.iron,
      zinc: acc.minerals.zinc + next.minerals.zinc,
    },
    other: {
      water: acc.other.water + next.other.water,
      caffeine: acc.other.caffeine + next.other.caffeine,
      alcohol: acc.other.alcohol + next.other.alcohol,
    },
  };
}

const zeroNutrientTotals: NonNullable<NutrientTotals> = {
  carbs: { total: 0, net: 0, fiber: 0, sugar: 0 },
  fats: {
    total: 0,
    saturated: 0,
    monounsaturated: 0,
    polyunsaturated: 0,
    trans: 0,
    cholesterol: 0,
  },
  protein: { total: 0, leucine: 0, isoleucine: 0, valine: 0, tryptophan: 0 },
  vitamins: { a: 0, b12: 0, b9: 0, c: 0, d: 0, e: 0, k: 0 },
  minerals: {
    sodium: 0,
    potassium: 0,
    magnesium: 0,
    calcium: 0,
    iron: 0,
    zinc: 0,
  },
  other: { water: 0, caffeine: 0, alcohol: 0 },
};

type DailyEntry = {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  mealsCount: number;
  steps: number | null;
  activeEnergyKcal: number | null;
  distanceMeters: number | null;
  glucoseAvgMmolL: number | null;
  glucoseMinMmolL: number | null;
  glucoseMaxMmolL: number | null;
  glucoseOutOfRangeCount: number;
  glucoseReadingsCount: number;
  bpSystolicAvg: number | null;
  bpDiastolicAvg: number | null;
  bpPulseAvg: number | null;
  bpReadingsCount: number;
};

const getMonthlyReport = query({
  args: {
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, { timezoneOffsetMinutes }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const profile = await ctx.db
        .query("profiles")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .first();
      if (!profile) throw new Error("Profile not found");

      const offsetMs = timezoneOffsetMinutes * 60_000;
      const now = Date.now();
      const localNowMs = now - offsetMs;
      const localTodayMidnightMs = Math.floor(localNowMs / dayMs) * dayMs;
      const localRangeStartMs =
        localTodayMidnightMs - (reportDays - 1) * dayMs;

      const rangeStartUtc = localRangeStartMs + offsetMs;
      const rangeEndUtc = localTodayMidnightMs + dayMs + offsetMs;

      const dateStrings = Array.from({ length: reportDays }, (_, i) =>
        toDateString(localRangeStartMs + i * dayMs)
      );

      const days = new Map<string, DailyEntry>(
        dateStrings.map((date) => [
          date,
          {
            date,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            mealsCount: 0,
            steps: null,
            activeEnergyKcal: null,
            distanceMeters: null,
            glucoseAvgMmolL: null,
            glucoseMinMmolL: null,
            glucoseMaxMmolL: null,
            glucoseOutOfRangeCount: 0,
            glucoseReadingsCount: 0,
            bpSystolicAvg: null,
            bpDiastolicAvg: null,
            bpPulseAvg: null,
            bpReadingsCount: 0,
          },
        ])
      );

      const localDateOf = (utcMs: number) => toDateString(utcMs - offsetMs);

      // Питание
      const meals = await ctx.db
        .query("meals")
        .withIndex("byUserId", (idx) =>
          idx
            .eq("userId", userId)
            .gte("_creationTime", rangeStartUtc)
            .lt("_creationTime", rangeEndUtc)
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("status"), "error"),
            q.neq(q.field("status"), "deleted")
          )
        )
        .collect();

      let nutrientTotals: NonNullable<NutrientTotals> | null = null;

      for (const meal of meals) {
        const entry = days.get(localDateOf(meal._creationTime));
        if (!entry) continue;

        entry.mealsCount += 1;
        entry.calories += meal.totalMacros?.calories ?? 0;
        entry.protein += meal.totalMacros?.protein ?? 0;
        entry.carbs += meal.totalMacros?.carbs ?? 0;
        entry.fat += meal.totalMacros?.fat ?? 0;
        entry.fiber += meal.totalMicros?.fiber ?? 0;
        entry.sugar += meal.totalMicros?.sugar ?? 0;
        entry.sodium += meal.totalMicros?.sodium ?? 0;

        if (meal.totalNutrients) {
          nutrientTotals = addNutrientTotals(
            nutrientTotals ?? zeroNutrientTotals,
            meal.totalNutrients
          );
        }
      }

      // Глюкоза
      const glucoseReadings = await ctx.db
        .query("glucoseReadings")
        .withIndex("byUserIdAndRecordedAt", (idx) =>
          idx
            .eq("userId", userId)
            .gte("recordedAt", rangeStartUtc)
            .lt("recordedAt", rangeEndUtc)
        )
        .collect();

      const glucoseValuesByDay = new Map<string, number[]>();
      let glucoseInRangeCount = 0;
      let glucoseOutOfRangeCount = 0;

      for (const reading of glucoseReadings) {
        const dateKey = localDateOf(reading.recordedAt);
        const entry = days.get(dateKey);
        if (!entry) continue;

        const mmolL = toMmolL(reading.value, reading.unit);
        const bucket = glucoseValuesByDay.get(dateKey) ?? [];
        bucket.push(mmolL);
        glucoseValuesByDay.set(dateKey, bucket);

        entry.glucoseReadingsCount += 1;
        if (isGlucoseOutOfRange(reading.value, reading.unit, reading.context)) {
          entry.glucoseOutOfRangeCount += 1;
          glucoseOutOfRangeCount += 1;
        } else {
          glucoseInRangeCount += 1;
        }
      }

      for (const [dateKey, values] of glucoseValuesByDay) {
        const entry = days.get(dateKey);
        if (!entry) continue;
        entry.glucoseAvgMmolL =
          values.reduce((sum, v) => sum + v, 0) / values.length;
        entry.glucoseMinMmolL = Math.min(...values);
        entry.glucoseMaxMmolL = Math.max(...values);
      }

      // Давление
      const bloodPressureReadings = await ctx.db
        .query("bloodPressureReadings")
        .withIndex("byUserId", (idx) =>
          idx
            .eq("userId", userId)
            .gte("_creationTime", rangeStartUtc)
            .lt("_creationTime", rangeEndUtc)
        )
        .collect();

      const bpByDay = new Map<
        string,
        { systolic: number[]; diastolic: number[]; pulse: number[] }
      >();

      for (const reading of bloodPressureReadings) {
        const dateKey = localDateOf(reading._creationTime);
        const entry = days.get(dateKey);
        if (!entry) continue;

        entry.bpReadingsCount += 1;
        const bucket = bpByDay.get(dateKey) ?? {
          systolic: [],
          diastolic: [],
          pulse: [],
        };
        bucket.systolic.push(reading.systolic);
        bucket.diastolic.push(reading.diastolic);
        if (reading.pulse !== undefined) bucket.pulse.push(reading.pulse);
        bpByDay.set(dateKey, bucket);
      }

      const average = (values: number[]) =>
        values.length === 0
          ? null
          : values.reduce((sum, v) => sum + v, 0) / values.length;

      for (const [dateKey, bucket] of bpByDay) {
        const entry = days.get(dateKey);
        if (!entry) continue;
        entry.bpSystolicAvg = average(bucket.systolic);
        entry.bpDiastolicAvg = average(bucket.diastolic);
        entry.bpPulseAvg = average(bucket.pulse);
      }

      // Активность (HealthKit, только iOS)
      const movementRows = await ctx.db
        .query("movementData")
        .withIndex("byUserIdAndDate", (idx) =>
          idx
            .eq("userId", userId)
            .gte("date", dateStrings[0])
            .lte("date", dateStrings[dateStrings.length - 1])
        )
        .collect();

      for (const row of movementRows) {
        const entry = days.get(row.date);
        if (!entry) continue;
        entry.steps = row.steps;
        entry.activeEnergyKcal = row.activeEnergyKcal;
        entry.distanceMeters = row.distanceMeters;
      }

      const dailyEntries = Array.from(days.values());
      const loggedDaysCount = dailyEntries.filter(
        (day) => day.mealsCount > 0
      ).length;

      return {
        rangeStartUtc,
        rangeEndUtc,
        totalDays: reportDays,
        loggedDaysCount,
        goalTrack: profile.data?.goalTrack ?? null,
        targets: profile.targets,
        days: dailyEntries,
        nutrientTotals,
        glucose:
          glucoseReadings.length === 0
            ? null
            : {
                readingsCount: glucoseReadings.length,
                inRangeCount: glucoseInRangeCount,
                outOfRangeCount: glucoseOutOfRangeCount,
              },
        bloodPressure:
          bloodPressureReadings.length === 0
            ? null
            : {
                readingsCount: bloodPressureReadings.length,
                avgSystolic: average(
                  bloodPressureReadings.map((r) => r.systolic)
                ),
                avgDiastolic: average(
                  bloodPressureReadings.map((r) => r.diastolic)
                ),
                avgPulse: average(
                  bloodPressureReadings
                    .map((r) => r.pulse)
                    .filter((p): p is number => p !== undefined)
                ),
              },
      };
    } catch (error) {
      logError("getMonthlyReport error", error);
      throw error;
    }
  },
});

export default getMonthlyReport;
