import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api } from "../../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { rateLimiter } from "../../rateLimit";
import { subscriptionConfig } from "@/config/subscriptionConfig";
import detectMealItemsFromText from "./detectMealItemsFromText";
import { analyzeMealConfig } from "./analyzeMealConfig";

const detectMealFromText = action({
  args: { description: v.string() },
  handler: async (ctx, { description }) => {
    if (description.length > analyzeMealConfig.maxUserInputLength) {
      throw new Error("Description too long");
    }

    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const profile = await ctx.runQuery(api.profiles.getProfile.default);
    if (subscriptionConfig.isMonetizationEnabled && !profile?.isPro)
      throw new Error("Pro subscription required");

    await rateLimiter.limit(ctx, "aiFeatures", { key: userId, throws: true });

    return await detectMealItemsFromText({ description });
  },
});

export default detectMealFromText;
