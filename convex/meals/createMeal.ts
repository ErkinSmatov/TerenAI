import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { resolveEatenAt } from "../utils/resolveEatenAt";

const createMeal = mutation({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("processing"))),
    photoStorageId: v.optional(v.id("_storage")),
    eatenAt: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"meals">> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const mealId = await ctx.db.insert("meals", {
        userId,
        status: args.status ?? "pending",
        photoStorageId: args.photoStorageId,
        eatenAt: resolveEatenAt(args.eatenAt, Date.now()),
      });

      return mealId;
    } catch (error) {
      logError("createMeal error", error);
      throw error;
    }
  },
});

export default createMeal;
