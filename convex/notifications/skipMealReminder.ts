import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getLocalParts } from "@/lib/notifications/reminderSchedule";
import logError from "@/lib/utils/logError";

// Кнопка «Пропускаю» у FOOD-01 (xlsx: «Не отправлять, если… пользователь
// выбрал «Пропускаю»»). Метка действует до конца локальных суток для
// выбранного приёма пищи; проверяется в checkScheduledPushes.
const skipMealReminder = mutation({
  args: {
    pointId: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner")
    ),
  },
  handler: async (ctx, { pointId }): Promise<null> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const profile = await ctx.db
        .query("profiles")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .first();
      if (!profile) throw new Error("Profile not found");

      const token = await ctx.db
        .query("pushTokens")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .first();
      const offset = token?.timezoneOffsetMinutes ?? 0;

      await ctx.db.patch(profile._id, {
        lastMealSkip: {
          pointId,
          dayStartUtcMs: getLocalParts(Date.now(), offset).localDayStartUtcMs,
        },
      });

      return null;
    } catch (error) {
      logError("skipMealReminder error", error);
      throw error;
    }
  },
});

export default skipMealReminder;
