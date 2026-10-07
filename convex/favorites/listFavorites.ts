import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import logError from "@/lib/utils/logError";
import { FAVORITES_LIMIT } from "./favoritesConfig";

const listFavorites = query({
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) return [];

      const favorites = await ctx.db
        .query("favoriteMeals")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(FAVORITES_LIMIT);

      return await Promise.all(
        favorites.map(async (favorite) => ({
          ...favorite,
          photoUrl: favorite.photoStorageId
            ? await ctx.storage.getUrl(favorite.photoStorageId)
            : null,
        }))
      );
    } catch (error) {
      logError("listFavorites error", error);
      throw error;
    }
  },
});

export default listFavorites;
