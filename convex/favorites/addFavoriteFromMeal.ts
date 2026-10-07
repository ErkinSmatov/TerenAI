import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import logError from "@/lib/utils/logError";
import { FAVORITES_LIMIT, FAVORITES_LIMIT_ERROR_CODE } from "./favoritesConfig";
import { favoriteSignature } from "./favoriteSignature";

const addFavoriteFromMeal = mutation({
  args: { mealId: v.id("meals") },
  handler: async (ctx, { mealId }): Promise<Id<"favoriteMeals">> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const meal = await ctx.db.get(mealId);
      if (!meal) throw new Error("Not found");
      if (meal.userId !== userId) throw new Error("Forbidden");
      if (meal.status !== "done" || !meal.confirmedItems?.length) {
        throw new Error("Meal cannot be favorited");
      }

      const existingBySource = await ctx.db
        .query("favoriteMeals")
        .withIndex("byUserIdAndSourceMealId", (q) =>
          q.eq("userId", userId).eq("sourceMealId", mealId)
        )
        .first();
      if (existingBySource) return existingBySource._id;

      const favorites = await ctx.db
        .query("favoriteMeals")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .take(FAVORITES_LIMIT + 1);

      const signature = favoriteSignature(meal.name, meal.confirmedItems);
      const duplicate = favorites.find(
        (favorite) => favoriteSignature(favorite.name, favorite.items) === signature
      );
      if (duplicate) return duplicate._id;

      if (favorites.length >= FAVORITES_LIMIT) {
        throw new ConvexError({ code: FAVORITES_LIMIT_ERROR_CODE });
      }

      return await ctx.db.insert("favoriteMeals", {
        userId,
        name: meal.name ?? "Блюдо",
        items: meal.confirmedItems.map(({ name, nameRu, grams }) => ({
          name,
          nameRu,
          grams,
        })),
        photoStorageId: meal.photoStorageId,
        sourceMealId: mealId,
      });
    } catch (error) {
      logError("addFavoriteFromMeal error", error);
      throw error;
    }
  },
});

export default addFavoriteFromMeal;
