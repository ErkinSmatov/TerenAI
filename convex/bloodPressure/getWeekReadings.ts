import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const dayMs = 24 * 60 * 60 * 1000;

const getWeekReadings = query({
  args: {
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, { timezoneOffsetMinutes }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const now = Date.now();
      const offsetMs = timezoneOffsetMinutes * 60_000;

      const localNowMs = now - offsetMs;
      const localMidnightMs = Math.floor(localNowMs / dayMs) * dayMs;
      const localDayOfWeek = new Date(localNowMs).getUTCDay();
      const daysFromMonday = (localDayOfWeek + 6) % 7;
      const localMondayStartMs = localMidnightMs - daysFromMonday * dayMs;

      const weekStartUtc = localMondayStartMs + offsetMs;
      const weekEndUtc = weekStartUtc + 7 * dayMs;

      const readings = await ctx.db
        .query("bloodPressureReadings")
        .withIndex("byUserId", (idx) =>
          idx
            .eq("userId", userId)
            .gte("_creationTime", weekStartUtc)
            .lt("_creationTime", weekEndUtc)
        )
        .collect();

      const week = Array.from({ length: 7 }, () => [] as typeof readings);
      for (const reading of readings) {
        const localReadingMs = reading._creationTime - offsetMs;
        const dayIndex = Math.floor(
          (localReadingMs - localMondayStartMs) / dayMs
        );
        if (dayIndex >= 0 && dayIndex < 7) {
          week[dayIndex].push(reading);
        }
      }

      for (const dayReadings of week) {
        dayReadings.sort((a, b) => b._creationTime - a._creationTime);
      }

      return week;
    } catch (error) {
      logError("getWeekReadings error", error);
      throw error;
    }
  },
});

export default getWeekReadings;
