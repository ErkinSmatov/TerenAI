import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { insertImportedGlucoseReadings } from "../utils/importGlucoseBatch";

// Устаревший путь для уже установленных iOS-сборок; новый клиент использует importGlucoseReadings
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

      return await insertImportedGlucoseReadings(
        ctx,
        userId,
        "healthkit",
        readings.map((r) => ({
          value: r.value,
          unit: r.unit,
          recordedAt: r.recordedAt,
          externalId: r.healthKitUuid,
        }))
      );
    } catch (error) {
      logError("importHealthKitReadings error", error);
      throw error;
    }
  },
});

export default importHealthKitReadings;
