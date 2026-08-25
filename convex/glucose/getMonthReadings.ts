import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import {
  assertLocalMonthBounds,
  getLocalMonthDayIndex,
} from "../utils/localMonthBounds";

const getMonthReadings = query({
  args: {
    dayStartsUtc: v.array(v.number()),
  },
  handler: async (ctx, { dayStartsUtc }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      assertLocalMonthBounds(dayStartsUtc);
      const monthStartUtc = dayStartsUtc[0];
      const monthEndUtc = dayStartsUtc[dayStartsUtc.length - 1];

      const readings = await ctx.db
        .query("glucoseReadings")
        .withIndex("byUserIdAndRecordedAt", (idx) =>
          idx
            .eq("userId", userId)
            .gte("recordedAt", monthStartUtc)
            .lt("recordedAt", monthEndUtc)
        )
        .collect();

      const month = Array.from(
        { length: dayStartsUtc.length - 1 },
        () => [] as typeof readings
      );
      for (const reading of readings) {
        const dayIndex = getLocalMonthDayIndex(dayStartsUtc, reading.recordedAt);
        if (dayIndex >= 0 && dayIndex < dayStartsUtc.length - 1) {
          month[dayIndex].push(reading);
        }
      }

      for (const dayReadings of month) {
        dayReadings.sort((a, b) => b.recordedAt - a.recordedAt);
      }

      return month;
    } catch (error) {
      logError("getMonthReadings error", error);
      throw error;
    }
  },
});

export default getMonthReadings;
