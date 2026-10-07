import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import { getMealTime } from "@/lib/meals/getMealTime";
import logError from "@/lib/utils/logError";
import {
  assertLocalMonthBounds,
  getLocalMonthDayIndex,
} from "../utils/localMonthBounds";

const getMonthMeals = query({
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

      const mealsQuery = ctx.db
        .query("meals")
        .withIndex("byUserIdAndEatenAt", (idx) =>
          idx
            .eq("userId", userId)
            .gte("eatenAt", monthStartUtc)
            .lt("eatenAt", monthEndUtc)
        )
        .filter((q) => q.neq(q.field("status"), "deleted"));

      const meals = await mealsQuery.collect();

      const month = Array.from(
        { length: dayStartsUtc.length - 1 },
        () => [] as typeof meals
      );
      for (const meal of meals) {
        const dayIndex = getLocalMonthDayIndex(dayStartsUtc, getMealTime(meal));
        if (dayIndex >= 0 && dayIndex < dayStartsUtc.length - 1) {
          month[dayIndex].push(meal);
        }
      }

      for (const dayMeals of month) {
        dayMeals.sort((a, b) => getMealTime(b) - getMealTime(a));
      }

      return await Promise.all(
        month.map((dayMeals) =>
          Promise.all(
            dayMeals.map(async (meal) => ({
              ...meal,
              photoUrl: meal.photoStorageId
                ? await ctx.storage.getUrl(meal.photoStorageId)
                : null,
            }))
          )
        )
      );
    } catch (error) {
      logError("getMonthMeals error", error);
      throw error;
    }
  },
});

export default getMonthMeals;
