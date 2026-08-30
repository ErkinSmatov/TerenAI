import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import logError from "@/lib/utils/logError";

const markBadgeSeen = mutation({
  args: {
    badgeId: v.id("badges"),
  },
  handler: async (ctx, { badgeId }): Promise<null> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const badge = await ctx.db.get(badgeId);
      if (!badge) throw new Error("Forbidden");
      if (badge.userId !== userId) throw new Error("Forbidden");

      await ctx.db.patch(badgeId, { seenAt: Date.now() });
      return null;
    } catch (error) {
      logError("markBadgeSeen error", error);
      throw error;
    }
  },
});

export default markBadgeSeen;
