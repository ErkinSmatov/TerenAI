import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import { getMealTime } from "@/lib/meals/getMealTime";
import { computeStreakFromMealTimes } from "../utils/streakDays";

const getStreak = query({
  args: {
    timezoneOffsetMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { timezoneOffsetMinutes }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return 0;

    const meals = await ctx.db
      .query("meals")
      .withIndex("byUserIdAndEatenAt", (q) => q.eq("userId", userId))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "done"))
      .collect();

    return computeStreakFromMealTimes(
      meals.map(getMealTime),
      Date.now(),
      timezoneOffsetMinutes ?? 0
    );
  },
});

export default getStreak;
