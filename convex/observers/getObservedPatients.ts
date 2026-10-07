import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { localDayBoundaries } from "../utils/localDayBoundaries";
import { isGlucoseOutOfRange, isCaloriesExceeded } from "./utils/thresholds";

function resolveDisplayName(user: {
  name?: string;
  email?: string;
  phone?: string;
}): string {
  return user.name ?? user.email ?? user.phone ?? "Гость";
}

const getObservedPatients = query({
  args: {
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, { timezoneOffsetMinutes }) => {
    try {
      const observerId = await getAuthUserId(ctx);
      if (observerId === null) throw new Error("Unauthorized");

      const links = await ctx.db
        .query("observerLinks")
        .withIndex("byObserverId", (q) => q.eq("observerId", observerId))
        .collect();

      const { startUtc, endUtc, dateString } = localDayBoundaries(
        Date.now(),
        timezoneOffsetMinutes
      );

      const results: {
        patientId: Id<"users">;
        linkId: Id<"observerLinks">;
        displayName: string;
        mealsCount: number;
        caloriesTotal: number;
        caloriesTarget: number | null;
        isCaloriesExceeded: boolean;
        latestGlucose: {
          value: number;
          unit: "mmol/L" | "mg/dL";
          context?: "fasting" | "beforeMeal" | "afterMeal" | "random";
          recordedAt: number;
        } | null;
        isGlucoseOutOfRange: boolean;
        steps: number | null;
        distanceMeters: number | null;
        isGlucometerTrack: boolean;
        _creationTime: number;
      }[] = [];

      for (const link of links) {
        const patient = await ctx.db.get(link.patientId);
        if (!patient) continue; // связь с несуществующим пациентом — пропускаем

        const patientProfile = await ctx.db
          .query("profiles")
          .withIndex("byUserId", (q) => q.eq("userId", link.patientId))
          .first();

        const meals = await ctx.db
          .query("meals")
          .withIndex("byUserId", (q) =>
            q
              .eq("userId", link.patientId)
              .gte("_creationTime", startUtc)
              .lt("_creationTime", endUtc)
          )
          .filter((q) =>
            q.and(
              q.neq(q.field("status"), "error"),
              q.neq(q.field("status"), "deleted")
            )
          )
          .collect();

        const mealsCount = meals.length;
        const caloriesTotal = Math.round(
          meals.reduce(
            (sum, meal) => sum + (meal.totalMacros?.calories ?? 0),
            0
          )
        );

        const caloriesTarget = patientProfile?.targets.calories ?? null;
        const caloriesExceeded =
          caloriesTarget === null
            ? false
            : isCaloriesExceeded(caloriesTotal, caloriesTarget);

        const glucoseReadings = await ctx.db
          .query("glucoseReadings")
          .withIndex("byUserIdAndRecordedAt", (q) =>
            q
              .eq("userId", link.patientId)
              .gte("recordedAt", startUtc)
              .lt("recordedAt", endUtc)
          )
          .collect();

        let latestGlucose: (typeof results)[number]["latestGlucose"] = null;
        for (const reading of glucoseReadings) {
          if (!latestGlucose || reading.recordedAt > latestGlucose.recordedAt) {
            latestGlucose = {
              value: reading.value,
              unit: reading.unit,
              context: reading.context,
              recordedAt: reading.recordedAt,
            };
          }
        }

        const glucoseOutOfRange = glucoseReadings.some((reading) =>
          isGlucoseOutOfRange(reading.value, reading.unit, reading.context)
        );

        const movementRow = await ctx.db
          .query("movementData")
          .withIndex("byUserIdAndDate", (q) =>
            q.eq("userId", link.patientId).eq("date", dateString)
          )
          .first();

        results.push({
          patientId: link.patientId,
          linkId: link._id,
          displayName: resolveDisplayName(patient),
          mealsCount,
          caloriesTotal,
          caloriesTarget,
          isCaloriesExceeded: caloriesExceeded,
          latestGlucose,
          isGlucoseOutOfRange: glucoseOutOfRange,
          steps: movementRow?.steps ?? null,
          distanceMeters: movementRow?.distanceMeters ?? null,
          isGlucometerTrack: patientProfile?.data?.goalTrack === "glucometer",
          _creationTime: link._creationTime,
        });
      }

      results.sort((a, b) => b._creationTime - a._creationTime);

      return results.map(({ _creationTime, ...rest }) => rest);
    } catch (error) {
      logError("getObservedPatients error", error);
      throw error;
    }
  },
});

export default getObservedPatients;
