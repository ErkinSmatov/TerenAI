import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import logError from "@/lib/utils/logError";

const confirmMeal = mutation({
  args: {
    photoStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    mealName: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        nameRu: v.optional(v.string()),
        grams: v.number(),
      })
    ),
  },
  handler: async (
    ctx,
    { photoStorageId, description, mealName, items }
  ): Promise<Id<"meals">> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const cleanItems = items
        .filter((i) => i.name.trim().length > 0)
        .map((i) => {
          const trimmedNameRu = i.nameRu?.trim();
          return {
            name: i.name.trim(),
            nameRu: trimmedNameRu?.length ? trimmedNameRu : undefined,
            grams: Math.max(1, Math.min(1500, Math.round(i.grams))),
          };
        })
        .slice(0, 30);

      if (cleanItems.length === 0) throw new Error("No items to confirm");

      const mealId = await ctx.db.insert("meals", {
        userId,
        status: "processing",
        name: mealName,
        photoStorageId,
        description,
        confirmedItems: cleanItems,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.meals.analyze.processDetectedItemsAction.default,
        {
          mealId,
          userId,
          detectedItems: cleanItems,
          mealName,
          description,
          photoStorageId,
        }
      );

      return mealId;
    } catch (error) {
      logError("confirmMeal error", error);
      throw error;
    }
  },
});

export default confirmMeal;
