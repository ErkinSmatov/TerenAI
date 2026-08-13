import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const dayMs = 24 * 60 * 60 * 1000;

function toDateString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const getWeekMovement = query({
  args: {
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, { timezoneOffsetMinutes }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const now = Date.now();
      const offsetMs = timezoneOffsetMinutes * 60_000;

      const localNowMs = now - offsetMs;
      const localMidnightMs = Math.floor(localNowMs / dayMs) * dayMs;
      const localDayOfWeek = new Date(localNowMs).getUTCDay();
      const daysFromMonday = (localDayOfWeek + 6) % 7;
      const localMondayStartMs = localMidnightMs - daysFromMonday * dayMs;

      const dateStrings = Array.from({ length: 7 }, (_, i) =>
        toDateString(localMondayStartMs + i * dayMs)
      );

      const rows = await ctx.db
        .query("movementData")
        .withIndex("byUserIdAndDate", (idx) =>
          idx
            .eq("userId", userId)
            .gte("date", dateStrings[0])
            .lte("date", dateStrings[6])
        )
        .collect();

      const rowsByDate = new Map(rows.map((row) => [row.date, row]));
      return dateStrings.map((date) => rowsByDate.get(date) ?? null);
    } catch (error) {
      logError("getWeekMovement error", error);
      throw error;
    }
  },
});

export default getWeekMovement;
