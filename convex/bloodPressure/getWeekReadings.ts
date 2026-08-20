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
        const dayIndex = getLocalWeekDayIndex(
          dayStartsUtc,
          reading._creationTime
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
