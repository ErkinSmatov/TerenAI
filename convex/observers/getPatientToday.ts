import { query } from "../_generated/server";
import { v } from "convex/values";
import { getMealTime } from "@/lib/meals/getMealTime";
import logError from "@/lib/utils/logError";
import { assertObserverAccess } from "../utils/observerAuth";
import { localDayBoundaries } from "../utils/localDayBoundaries";
import { computeStreakFromMealTimes } from "../utils/streakDays";

function resolveDisplayName(user: {
  name?: string;
  email?: string;
  phone?: string;
}): string {
  return user.name ?? user.email ?? user.phone ?? "Гость";
}

const getPatientToday = query({
  args: {
    patientId: v.id("users"),
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, { patientId, timezoneOffsetMinutes }) => {
    try {
      // Единственная проверка авторизации — до любого чтения данных пациента.
      await assertObserverAccess(ctx, patientId);

      const { startUtc, endUtc, dateString } = localDayBoundaries(
        Date.now(),
        timezoneOffsetMinutes
      );

      const meals = await ctx.db
        .query("meals")
        .withIndex("byUserIdAndEatenAt", (q) =>
          q
            .eq("userId", patientId)
            .gte("eatenAt", startUtc)
            .lt("eatenAt", endUtc)
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("status"), "error"),
            q.neq(q.field("status"), "deleted")
          )
        )
        .collect();
      meals.sort((a, b) => getMealTime(b) - getMealTime(a));

      const glucoseReadings = await ctx.db
        .query("glucoseReadings")
        .withIndex("byUserIdAndRecordedAt", (q) =>
          q
            .eq("userId", patientId)
            .gte("recordedAt", startUtc)
            .lt("recordedAt", endUtc)
        )
        .collect();
      glucoseReadings.sort((a, b) => b.recordedAt - a.recordedAt);

      const bloodPressureReadings = await ctx.db
        .query("bloodPressureReadings")
        .withIndex("byUserId", (q) =>
          q
            .eq("userId", patientId)
            .gte("_creationTime", startUtc)
            .lt("_creationTime", endUtc)
        )
        .collect();
      bloodPressureReadings.sort((a, b) => b._creationTime - a._creationTime);

      const movement = await ctx.db
        .query("movementData")
        .withIndex("byUserIdAndDate", (q) =>
          q.eq("userId", patientId).eq("date", dateString)
        )
        .first();

      const patientProfile = await ctx.db
        .query("profiles")
        .withIndex("byUserId", (q) => q.eq("userId", patientId))
        .first();

      const patient = await ctx.db.get(patientId);
      const displayName = patient
        ? resolveDisplayName(patient)
        : ("Гость" as const);

      const mealsWithPhotoUrls = await Promise.all(
        meals.map(async (meal) => ({
          ...meal,
          photoUrl: meal.photoStorageId
            ? await ctx.storage.getUrl(meal.photoStorageId)
            : null,
        }))
      );

      const doneMeals = await ctx.db
        .query("meals")
        .withIndex("byUserIdAndEatenAt", (q) => q.eq("userId", patientId))
        .order("desc")
        .filter((q) => q.eq(q.field("status"), "done"))
        .collect();
      const streak = computeStreakFromMealTimes(
        doneMeals.map(getMealTime),
        Date.now(),
        timezoneOffsetMinutes
      );

      return {
        meals: mealsWithPhotoUrls,
        streak,
        movement: movement ?? null,
        glucoseReadings,
        bloodPressureReadings,
        targets: patientProfile?.targets ?? null,
        isGlucometerTrack: patientProfile?.data?.goalTrack === "glucometer",
        displayName,
      };
    } catch (error) {
      logError("getPatientToday error", error);
      throw error;
    }
  },
});

export default getPatientToday;
