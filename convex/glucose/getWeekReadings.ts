import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import {
  assertLocalWeekBounds,
  getLocalWeekDayIndex,
} from "../utils/localWeekBounds";

const getWeekReadings = query({
  args: {
    dayStartsUtc: v.array(v.number()),
  },
  handler: async (ctx, { dayStartsUtc }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      assertLocalWeekBounds(dayStartsUtc);
      const weekStartUtc = dayStartsUtc[0];
      const weekEndUtc = dayStartsUtc[7];

      const readings = await ctx.db
        .query("glucoseReadings")
        .withIndex("byUserIdAndRecordedAt", (idx) =>
          idx
            .eq("userId", userId)
            .gte("recordedAt", weekStartUtc)
            .lt("recordedAt", weekEndUtc)
        )
        .collect();

      const week = Array.from({ length: 7 }, () => [] as typeof readings);
      for (const reading of readings) {
        const dayIndex = getLocalWeekDayIndex(dayStartsUtc, reading.recordedAt);
        if (dayIndex >= 0 && dayIndex < 7) {
          week[dayIndex].push(reading);
        }
      }

      for (const dayReadings of week) {
        dayReadings.sort((a, b) => b.recordedAt - a.recordedAt);
      }

      return week;
    } catch (error) {
      logError("getWeekReadings error", error);
      throw error;
    }
  },
});

export default getWeekReadings;
