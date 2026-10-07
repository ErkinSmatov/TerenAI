import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import { getMealTime } from "@/lib/meals/getMealTime";
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
        .withIndex("byUserIdAndEatenAt", (idx) =>
          idx
            .eq("userId", userId)
            .gte("eatenAt", weekStartUtc)
            .lt("eatenAt", weekEndUtc)
        )
        .filter((q) => q.neq(q.field("status"), "deleted"));

      const meals = await mealsQuery.collect();

      const week = Array.from({ length: 7 }, () => [] as typeof meals);
      for (const meal of meals) {
        const dayIndex = getLocalWeekDayIndex(dayStartsUtc, getMealTime(meal));
        if (dayIndex >= 0 && dayIndex < 7) {
          week[dayIndex].push(meal);
        }
      }

      for (const dayMeals of week) {
        dayMeals.sort((a, b) => getMealTime(b) - getMealTime(a));
      }

      // Разрешаем storage id фото блюда в реальный URL здесь, а не на
      // клиенте — `ctx.storage.getUrl` доступен только в Convex-функциях.
      // `Promise.all` вместо последовательных `await` в цикле — резолвинг
      // независимый для каждого блюда, нет причин ждать по очереди.
      const weekWithPhotoUrls = await Promise.all(
        week.map((dayMeals) =>
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

      return weekWithPhotoUrls;
    } catch (error) {
      logError("getWeekMeals error", error);
      throw error;
    }
  },
});

export default getWeekMeals;
