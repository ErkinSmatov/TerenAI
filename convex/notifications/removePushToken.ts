import { mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "@/lib/utils/logError";

// Удаляет все строки pushTokens текущего пользователя (вызывается при выходе).
// Трогает только строки вызывающего (ASVS V4); без сессии — no-op.
const removePushToken = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) return null;

      const rows = await ctx.db
        .query("pushTokens")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }

      return null;
    } catch (error) {
      logError("removePushToken error", error);
      throw error;
    }
  },
});

export default removePushToken;
