import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { rateLimiter } from "../rateLimit";
import logError from "@/lib/utils/logError";

const retryProcessDetectedItems = mutation({
  args: { mealId: v.id("meals") },
  handler: async (ctx, { mealId }): Promise<null> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const meal = await ctx.db.get(mealId);
      if (!meal) throw new Error("Not found");
      if (meal.userId !== userId) throw new Error("Forbidden");
      if (meal.status !== "error") throw new Error("Meal is not in error state");
      if (!meal.confirmedItems || meal.confirmedItems.length === 0) {
        throw new Error("No confirmed items to retry");
      }

      await rateLimiter.limit(ctx, "mealRetry", { key: mealId, throws: true });

      await ctx.db.patch(mealId, { status: "processing" });

      await ctx.scheduler.runAfter(
        0,
        internal.meals.analyze.processDetectedItemsAction.default,
        {
          mealId,
          userId,
          detectedItems: meal.confirmedItems,
          mealName: meal.name ?? "",
          description: meal.description,
          photoStorageId: meal.photoStorageId,
        }
      );

      return null;
    } catch (error) {
      logError("retryProcessDetectedItems error", error);
      throw error;
    }
  },
});

export default retryProcessDetectedItems;
