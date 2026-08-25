import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import logError from "@/lib/utils/logError";
import { processDetectedItems } from "./processDetectedItems";

const processDetectedItemsAction = internalAction({
  args: {
    mealId: v.id("meals"),
    userId: v.id("users"),
    detectedItems: v.array(
      v.object({
        name: v.string(),
        nameRu: v.optional(v.string()),
        grams: v.number(),
      })
    ),
    mealName: v.string(),
    description: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (
    ctx,
    { mealId, userId, detectedItems, mealName, description, photoStorageId }
  ): Promise<null> => {
    try {
      const imageUrl = photoStorageId
        ? ((await ctx.storage.getUrl(photoStorageId)) ?? undefined)
        : undefined;

      await processDetectedItems({
        ctx,
        mealId,
        detectedItems,
        imageUrl,
        mealName,
        description,
        userId,
      });

      return null;
    } catch (error) {
      logError("processDetectedItemsAction error", error);
      try {
        await ctx.runMutation(internal.meals.updateMealInternal.default, {
          id: mealId,
          userId,
          meal: { status: "error" },
        });
      } catch (markError) {
        logError("processDetectedItemsAction mark-error failed", markError);
      }
      throw error;
    }
  },
});

export default processDetectedItemsAction;
