import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { assertObserverAccess } from "../utils/observerAuth";
import { localDayBoundaries } from "../utils/localDayBoundaries";

const HISTORY_DAYS = 30;
const dayMs = 24 * 60 * 60 * 1000;

const getPatientHistory = query({
  args: {
    patientId: v.id("users"),
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, { patientId, timezoneOffsetMinutes }) => {
    try {
      // Единственная проверка авторизации — до любого чтения данных пациента.
      await assertObserverAccess(ctx, patientId);

      const today = localDayBoundaries(Date.now(), timezoneOffsetMinutes);
      const rangeStartUtc = today.startUtc - (HISTORY_DAYS - 1) * dayMs;

      const meals = await ctx.db
        .query("meals")
        .withIndex("byUserId", (q) =>
          q
            .eq("userId", patientId)
            .gte("_creationTime", rangeStartUtc)
            .lt("_creationTime", today.endUtc)
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("status"), "error"),
            q.neq(q.field("status"), "deleted")
          )
        )
        .collect();

      const readings = await ctx.db
        .query("glucoseReadings")
        .withIndex("byUserIdAndRecordedAt", (q) =>
          q
            .eq("userId", patientId)
            .gte("recordedAt", rangeStartUtc)
            .lt("recordedAt", today.endUtc)
        )
        .collect();

      const days = [];
      for (let i = 0; i < HISTORY_DAYS; i++) {
        const startUtc = today.startUtc - i * dayMs;
        const endUtc = startUtc + dayMs;
        const { dateString } = localDayBoundaries(
          startUtc,
          timezoneOffsetMinutes
        );

        const dayMeals = meals.filter(
          (meal) => meal._creationTime >= startUtc && meal._creationTime < endUtc
        );
        const dayReadings = readings
          .filter(
            (reading) =>
              reading.recordedAt >= startUtc && reading.recordedAt < endUtc
          )
          .sort((a, b) => b.recordedAt - a.recordedAt);

        const movement = await ctx.db
          .query("movementData")
          .withIndex("byUserIdAndDate", (q) =>
            q.eq("userId", patientId).eq("date", dateString)
          )
          .first();

        if (
          dayMeals.length === 0 &&
          dayReadings.length === 0 &&
          movement === null
        ) {
          continue;
        }

        let glucose: {
          unit: "mmol/L" | "mg/dL";
          average: number;
          min: number;
          max: number;
          count: number;
        } | null = null;
        if (dayReadings.length > 0) {
          const unit = dayReadings[0].unit;
          const values = dayReadings
            .filter((reading) => reading.unit === unit)
            .map((reading) => reading.value);
          const sum = values.reduce((acc, value) => acc + value, 0);
          glucose = {
            unit,
            average: Math.round((sum / values.length) * 10) / 10,
            min: Math.min(...values),
            max: Math.max(...values),
            count: values.length,
          };
        }

        days.push({
          date: dateString,
          mealsCount: dayMeals.length,
          calories: Math.round(
            dayMeals.reduce(
              (sum, meal) => sum + (meal.totalMacros?.calories ?? 0),
              0
            )
          ),
          steps: movement?.steps ?? null,
          distanceMeters: movement?.distanceMeters ?? null,
          glucose,
        });
      }

      return days;
    } catch (error) {
      logError("getPatientHistory error", error);
      throw error;
    }
  },
});

export default getPatientHistory;
