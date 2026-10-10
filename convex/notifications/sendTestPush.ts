import { internalAction, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import logError from "@/lib/utils/logError";

type SendTestPushResult =
  | { sent: false; reason: "NO_PUSH_TOKEN" }
  | { sent: true; platform: "ios" | "android"; tokenSuffix: string; updatedAt: number };

export const getPushTokenForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("pushTokens")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();
  },
});

// Тестовая отправка push конкретному пользователю (диагностика D-13):
// npx convex run --prod notifications/sendTestPush:default '{"userId":"..."}'
const sendTestPush = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<SendTestPushResult> => {
    try {
      const token = await ctx.runQuery(
        internal.notifications.sendTestPush.getPushTokenForUser,
        { userId }
      );
      if (!token) return { sent: false, reason: "NO_PUSH_TOKEN" };

      await ctx.scheduler.runAfter(
        0,
        internal.notifications.sendPushNotification.default,
        {
          messages: [
            {
              expoPushToken: token.expoPushToken,
              title: "Тестовое уведомление",
              body: "Если вы видите это сообщение, push работает",
            },
          ],
          receiptsDelayMs: 60 * 1000,
        }
      );

      return {
        sent: true,
        platform: token.platform,
        tokenSuffix: token.expoPushToken.slice(-6),
        updatedAt: token.updatedAt,
      };
    } catch (error) {
      logError("sendTestPush error", error);
      throw error;
    }
  },
});

export default sendTestPush;
