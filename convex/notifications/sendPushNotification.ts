import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import logError from "@/lib/utils/logError";

// Лимит Expo Push API на одну пачку.
const EXPO_PUSH_BATCH_SIZE = 100;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Задержка перед проверкой receipts (рекомендация Expo: ~15 минут).
const RECEIPTS_DELAY_MS = 15 * 60 * 1000;
// Должен совпадать с id канала в components/notifications/NotificationsProvider.tsx
// (setNotificationChannelAsync("default")). Канал создаётся на Android до регистрации
// токена, поэтому сообщение с этим channelId не потеряется (Expo не показывает push,
// если указанного канала на устройстве нет). iOS поле игнорирует.
const ANDROID_CHANNEL_ID = "default";

type PushMessage = {
  expoPushToken: string;
  title: string;
  body: string;
  data?: { url: string };
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const postBatch = async (
  batch: PushMessage[]
): Promise<ExpoPushResponse | null> => {
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(
      batch.map((message) => ({
        to: message.expoPushToken,
        title: message.title,
        body: message.body,
        sound: "default",
        channelId: ANDROID_CHANNEL_ID,
        data: message.data,
      }))
    ),
  });

  if (!response.ok) {
    throw new Error(`Expo push API responded with status ${response.status}`);
  }

  return (await response.json()) as ExpoPushResponse;
};

const sendBatchWithRetry = async (
  batch: PushMessage[]
): Promise<ExpoPushResponse | null> => {
  try {
    return await postBatch(batch);
  } catch (error) {
    logError("sendPushNotification batch error, retrying once", error);
    try {
      return await postBatch(batch);
    } catch (retryError) {
      logError("sendPushNotification batch retry failed", retryError);
      return null;
    }
  }
};

const sendPushNotification = internalAction({
  args: {
    messages: v.array(
      v.object({
        expoPushToken: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.object({ url: v.string() })),
      })
    ),
    receiptsDelayMs: v.optional(v.number()),
  },
  handler: async (ctx, { messages, receiptsDelayMs }): Promise<null> => {
    try {
      if (messages.length === 0) return null;

      const batches = chunk(messages, EXPO_PUSH_BATCH_SIZE);
      const receiptTickets: { id: string; expoPushToken: string }[] = [];

      for (const batch of batches) {
        const result = await sendBatchWithRetry(batch);
        if (!result?.data) continue;

        for (let i = 0; i < result.data.length; i++) {
          const ticket = result.data[i];
          const message = batch[i];
          if (ticket.status === "ok" && ticket.id) {
            receiptTickets.push({
              id: ticket.id,
              expoPushToken: message.expoPushToken,
            });
            continue;
          }
          if (ticket.status !== "error") continue;

          if (ticket.details?.error === "DeviceNotRegistered") {
            await ctx.runMutation(
              internal.notifications.sendPushNotification.deleteInvalidToken,
              { expoPushToken: message.expoPushToken }
            );
          } else {
            logError(
              "sendPushNotification ticket error",
              new Error(
                `${ticket.details?.error ?? "UnknownError"}: ${
                  ticket.message ?? ""
                }`
              )
            );
          }
        }
      }

      if (receiptTickets.length > 0) {
        await ctx.scheduler.runAfter(
          receiptsDelayMs ?? RECEIPTS_DELAY_MS,
          internal.notifications.checkPushReceipts.default,
          { tickets: receiptTickets }
        );
      }

      return null;
    } catch (error) {
      logError("sendPushNotification error", error);
      return null;
    }
  },
});

export const deleteInvalidToken = internalMutation({
  args: { expoPushToken: v.string() },
  handler: async (ctx, { expoPushToken }) => {
    try {
      const existing = await ctx.db
        .query("pushTokens")
        .withIndex("byExpoPushToken", (q) =>
          q.eq("expoPushToken", expoPushToken)
        )
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return null;
    } catch (error) {
      logError("deleteInvalidToken error", error);
      throw error;
    }
  },
});

export default sendPushNotification;
