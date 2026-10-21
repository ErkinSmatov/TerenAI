import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "@/lib/utils/logError";

// Формат Expo push-токена: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]".
// Проверяется до записи в базу (ASVS V5, T-69-22) — невалидные токены
// тратят квоту Expo Push API и засоряют выборку cron плана 69-07.
const EXPO_PUSH_TOKEN_PATTERN = /^ExponentPushToken\[[^\]]+\]$/;

const recordPushToken = mutation({
  args: {
    expoPushToken: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, { expoPushToken, platform, timezoneOffsetMinutes }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      if (!EXPO_PUSH_TOKEN_PATTERN.test(expoPushToken)) {
        throw new Error("Invalid push token format");
      }

      if (
        !Number.isInteger(timezoneOffsetMinutes) ||
        timezoneOffsetMinutes < -840 ||
        timezoneOffsetMinutes > 840
      ) {
        throw new Error("Invalid timezone offset");
      }

      // Владелец токена — последний вошедший на устройстве пользователь
      // (фикс дублей фазы 74, WR-05): удаляем строки того же токена у других userId.
      const sameTokenRows = await ctx.db
        .query("pushTokens")
        .withIndex("byExpoPushToken", (q) =>
          q.eq("expoPushToken", expoPushToken)
        )
        .collect();
      let removedForeignRows = 0;
      for (const row of sameTokenRows) {
        if (row.userId !== userId) {
          await ctx.db.delete(row._id);
          removedForeignRows += 1;
        }
      }

      const existing = await ctx.db
        .query("pushTokens")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .first();

      const action = existing
        ? existing.expoPushToken === expoPushToken
          ? "refreshed"
          : "replaced"
        : "inserted";

      if (existing) {
        await ctx.db.patch(existing._id, {
          expoPushToken,
          platform,
          timezoneOffsetMinutes,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("pushTokens", {
          userId,
          expoPushToken,
          platform,
          timezoneOffsetMinutes,
          updatedAt: Date.now(),
        });
      }

      console.log(
        "recordPushToken registered",
        JSON.stringify({
          platform,
          tokenSuffix: expoPushToken.slice(-7),
          action,
          removedForeignRows,
        })
      );

      return null;
    } catch (error) {
      logError("recordPushToken error", error);
      throw error;
    }
  },
});

export default recordPushToken;
