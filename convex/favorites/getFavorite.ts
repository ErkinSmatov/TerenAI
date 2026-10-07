import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "../_generated/server";
import logError from "@/lib/utils/logError";

const getFavorite = query({
  args: { favoriteId: v.id("favoriteMeals") },
  handler: async (ctx, { favoriteId }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const favorite = await ctx.db.get(favoriteId);
      if (!favorite) return null;
      if (favorite.userId !== userId) throw new Error("Forbidden");

      return {
        ...favorite,
        photoUrl: favorite.photoStorageId
          ? await ctx.storage.getUrl(favorite.photoStorageId)
          : null,
      };
    } catch (error) {
      logError("getFavorite error", error);
      throw error;
    }
  },
});

export default getFavorite;
