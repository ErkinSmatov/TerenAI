import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import logError from "@/lib/utils/logError";

const getUnseenBadge = query({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) return null;

      const badge = await ctx.db
        .query("badges")
        .withIndex("byUserIdAndSeenAt", (q) =>
          q.eq("userId", userId).eq("seenAt", undefined)
        )
        .first();

      return badge ?? null;
    } catch (error) {
      logError("getUnseenBadge error", error);
      throw error;
    }
  },
});

export default getUnseenBadge;
