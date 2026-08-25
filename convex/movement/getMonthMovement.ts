import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { assertLocalMonthDates } from "../utils/localMonthBounds";

const getMonthMovement = query({
  args: {
    monthDates: v.array(v.string()),
  },
  handler: async (ctx, { monthDates }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      assertLocalMonthDates(monthDates);

      const rows = await ctx.db
        .query("movementData")
        .withIndex("byUserIdAndDate", (idx) =>
          idx
            .eq("userId", userId)
            .gte("date", monthDates[0])
            .lte("date", monthDates[monthDates.length - 1])
        )
        .collect();

      const rowsByDate = new Map(rows.map((row) => [row.date, row]));
      return monthDates.map((date) => rowsByDate.get(date) ?? null);
    } catch (error) {
      logError("getMonthMovement error", error);
      throw error;
    }
  },
});

export default getMonthMovement;
