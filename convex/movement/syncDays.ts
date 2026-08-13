import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const syncDays = mutation({
  args: {
    days: v.array(
      v.object({
        date: v.string(),
        steps: v.number(),
        activeEnergyKcal: v.number(),
        distanceMeters: v.number(),
      })
    ),
  },
  handler: async (ctx, { days }): Promise<void> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      for (const day of days) {
        const existing = await ctx.db
          .query("movementData")
          .withIndex("byUserIdAndDate", (idx) =>
            idx.eq("userId", userId).eq("date", day.date)
          )
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            steps: day.steps,
            activeEnergyKcal: day.activeEnergyKcal,
            distanceMeters: day.distanceMeters,
          });
        } else {
          await ctx.db.insert("movementData", { userId, ...day });
        }
      }
    } catch (error) {
      logError("syncDays error", error);
      throw error;
    }
  },
});

export default syncDays;
