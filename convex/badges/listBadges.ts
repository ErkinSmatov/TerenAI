import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import logError from "@/lib/utils/logError";

const listBadges = query({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) return [];

      return await ctx.db
        .query("badges")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .collect();
    } catch (error) {
      logError("listBadges error", error);
      throw error;
    }
  },
});

export default listBadges;
