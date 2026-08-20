import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import {
  assertLocalWeekBounds,
  getLocalWeekDayIndex,
} from "../utils/localWeekBounds";

const getWeekMeals = query({
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

      const mealsQuery = ctx.db
        .query("meals")
        .withIndex("byUserId", (idx) =>
          idx
            .eq("userId", userId)
            .gte("_creationTime", weekStartUtc)
            .lt("_creationTime", weekEndUtc)
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("status"), "error"),
            q.neq(q.field("status"), "deleted")
          )
        );

      const meals = await mealsQuery.collect();

      const week = Array.from({ length: 7 }, () => [] as typeof meals);
      for (const meal of meals) {
        const dayIndex = getLocalWeekDayIndex(dayStartsUtc, meal._creationTime);
        if (dayIndex >= 0 && dayIndex < 7) {
          week[dayIndex].push(meal);
        }
      }

      for (const dayMeals of week) {
        dayMeals.sort((a, b) => b._creationTime - a._creationTime);
      }

      return week;
    } catch (error) {
      logError("getWeekMeals error", error);
      throw error;
    }
  },
});

export default getWeekMeals;
