import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import logError from "@/lib/utils/logError";
import { FAVORITES_LIMIT } from "./favoritesConfig";
import { favoriteSignature } from "./favoriteSignature";

const getMealFavorite = query({
  args: { mealId: v.id("meals") },
  handler: async (ctx, { mealId }): Promise<Id<"favoriteMeals"> | null> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) return null;

      const bySource = await ctx.db
        .query("favoriteMeals")
        .withIndex("byUserIdAndSourceMealId", (q) =>
          q.eq("userId", userId).eq("sourceMealId", mealId)
        )
        .first();
      if (bySource) return bySource._id;

      const meal = await ctx.db.get(mealId);
      if (meal?.userId !== userId || !meal.confirmedItems?.length) {
        return null;
      }

      const signature = favoriteSignature(meal.name, meal.confirmedItems);
      const favorites = await ctx.db
        .query("favoriteMeals")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .take(FAVORITES_LIMIT);

      const match = favorites.find(
        (favorite) => favoriteSignature(favorite.name, favorite.items) === signature
      );

      return match?._id ?? null;
    } catch (error) {
      logError("getMealFavorite error", error);
      throw error;
    }
  },
});

export default getMealFavorite;
