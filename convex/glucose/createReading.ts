import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const createReading = mutation({
  args: {
    value: v.number(),
    unit: v.union(v.literal("mmol/L"), v.literal("mg/dL")),
    context: v.optional(
      v.union(
        v.literal("fasting"),
        v.literal("beforeMeal"),
        v.literal("afterMeal"),
        v.literal("random")
      )
    ),
  },
  handler: async (ctx, args): Promise<Id<"glucoseReadings">> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      return await ctx.db.insert("glucoseReadings", { userId, ...args });
    } catch (error) {
      logError("createReading error", error);
      throw error;
    }
  },
});

export default createReading;
