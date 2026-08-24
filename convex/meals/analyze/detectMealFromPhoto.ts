import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api } from "../../_generated/api";
import detectMealItems from "./detectMealItems";
import { getAuthUserId } from "@convex-dev/auth/server";
import { rateLimiter } from "../../rateLimit";
import { subscriptionConfig } from "@/config/subscriptionConfig";

const detectMealFromPhoto = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const profile = await ctx.runQuery(api.profiles.getProfile.default);
    if (subscriptionConfig.isMonetizationEnabled && !profile?.isPro)
      throw new Error("Pro subscription required");

    await rateLimiter.limit(ctx, "aiFeatures", { key: userId, throws: true });

    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) throw new Error("Image not found");

    return await detectMealItems({ imageUrl });
  },
});

export default detectMealFromPhoto;
