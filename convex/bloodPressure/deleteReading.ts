import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const deleteReading = mutation({
  args: { readingId: v.id("bloodPressureReadings") },
  handler: async (ctx, { readingId }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const reading = await ctx.db.get(readingId);
      if (!reading) return;
      if (reading.userId !== userId) throw new Error("Forbidden");

      await ctx.db.delete(readingId);
    } catch (error) {
      logError("deleteReading error", error);
      throw error;
    }
  },
});

export default deleteReading;
