import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { assertLocalWeekDates } from "../utils/localWeekBounds";

const getWeekMovement = query({
  args: {
    weekDates: v.array(v.string()),
  },
  handler: async (ctx, { weekDates }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      assertLocalWeekDates(weekDates);

      const rows = await ctx.db
        .query("movementData")
        .withIndex("byUserIdAndDate", (idx) =>
          idx
            .eq("userId", userId)
            .gte("date", weekDates[0])
            .lte("date", weekDates[6])
        )
        .collect();

      const rowsByDate = new Map(rows.map((row) => [row.date, row]));
      return weekDates.map((date) => rowsByDate.get(date) ?? null);
    } catch (error) {
      logError("getWeekMovement error", error);
      throw error;
    }
  },
});

export default getWeekMovement;
