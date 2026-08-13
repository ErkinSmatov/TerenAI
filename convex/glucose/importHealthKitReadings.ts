import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const importHealthKitReadings = mutation({
  args: {
    readings: v.array(
      v.object({
        value: v.number(),
        unit: v.union(v.literal("mmol/L"), v.literal("mg/dL")),
        recordedAt: v.number(),
        healthKitUuid: v.string(),
      })
    ),
  },
  handler: async (ctx, { readings }): Promise<number> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      let importedCount = 0;
      for (const reading of readings) {
        const existing = await ctx.db
          .query("glucoseReadings")
          .withIndex("byHealthKitUuid", (idx) =>
            idx.eq("healthKitUuid", reading.healthKitUuid)
          )
          .first();
        if (existing) continue;

        await ctx.db.insert("glucoseReadings", {
          userId,
          value: reading.value,
          unit: reading.unit,
          recordedAt: reading.recordedAt,
          source: "healthkit",
          healthKitUuid: reading.healthKitUuid,
        });
        importedCount++;
      }

      return importedCount;
    } catch (error) {
      logError("importHealthKitReadings error", error);
      throw error;
    }
  },
});

export default importHealthKitReadings;
