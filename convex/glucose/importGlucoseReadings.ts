import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import {
  insertImportedGlucoseReadings,
  MAX_IMPORT_BATCH,
} from "../utils/importGlucoseBatch";

const importGlucoseReadings = mutation({
  args: {
    source: v.union(v.literal("healthkit"), v.literal("healthconnect")),
    readings: v.array(
      v.object({
        value: v.number(),
        unit: v.union(v.literal("mmol/L"), v.literal("mg/dL")),
        recordedAt: v.number(),
        externalId: v.string(),
      })
    ),
  },
  handler: async (ctx, { source, readings }): Promise<number> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");
      if (readings.length > MAX_IMPORT_BATCH) {
        throw new Error("Слишком большая пачка показаний");
      }

      return await insertImportedGlucoseReadings(ctx, userId, source, readings);
    } catch (error) {
      logError("importGlucoseReadings error", error);
      throw error;
    }
  },
});

export default importGlucoseReadings;
