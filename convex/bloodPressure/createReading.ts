import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const createReading = mutation({
  args: {
    systolic: v.number(),
    diastolic: v.number(),
    pulse: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"bloodPressureReadings">> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      return await ctx.db.insert("bloodPressureReadings", {
        userId,
        ...args,
      });
    } catch (error) {
      logError("createReading error", error);
      throw error;
    }
  },
});

export default createReading;
