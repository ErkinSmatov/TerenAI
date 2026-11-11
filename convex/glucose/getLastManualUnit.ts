import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import logError from "@/lib/utils/logError";

// Единица для Android (Health Connect отдаёт обе): единица последнего ручного показания, иначе клиент берёт mmol/L
const getLastManualUnit = query({
  handler: async (ctx): Promise<"mmol/L" | "mg/dL" | null> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) return null;

      const last = await ctx.db
        .query("glucoseReadings")
        .withIndex("byUserIdAndSourceAndRecordedAt", (idx) =>
          idx.eq("userId", userId).eq("source", "manual")
        )
        .order("desc")
        .first();

      return last ? last.unit : null;
    } catch (error) {
      logError("getLastManualUnit error", error);
      throw error;
    }
  },
});

export default getLastManualUnit;
