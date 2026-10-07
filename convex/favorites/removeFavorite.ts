import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import logError from "@/lib/utils/logError";

const removeFavorite = mutation({
  args: { favoriteId: v.id("favoriteMeals") },
  returns: v.null(),
  handler: async (ctx, { favoriteId }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const favorite = await ctx.db.get(favoriteId);
      if (!favorite) return null;
      if (favorite.userId !== userId) throw new Error("Forbidden");

      // Файл в storage не удаляем: на него ссылаются исходный meal и блюда из избранного.
      await ctx.db.delete(favoriteId);
      return null;
    } catch (error) {
      logError("removeFavorite error", error);
      throw error;
    }
  },
});

export default removeFavorite;
