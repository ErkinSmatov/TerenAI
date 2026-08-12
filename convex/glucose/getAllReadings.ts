import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import logError from "@/lib/utils/logError";

const getAllReadings = query({
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      return await ctx.db
        .query("glucoseReadings")
        .withIndex("byUserId", (idx) => idx.eq("userId", userId))
        .order("desc")
        .collect();
    } catch (error) {
      logError("getAllReadings error", error);
      throw error;
    }
  },
});

export default getAllReadings;
