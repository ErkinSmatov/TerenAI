import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import logError from "@/lib/utils/logError";

// Лимит Expo getReceipts на один запрос.
const EXPO_RECEIPTS_BATCH_SIZE = 300;
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

type ExpoPushReceipt = {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
};

type ExpoReceiptsResponse = {
  data?: Record<string, ExpoPushReceipt | undefined>;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

// В логи пишем только хвост токена, полный токен не раскрываем.
const maskPushToken = (token: string): string => {
  const inner = token.endsWith("]") ? token.slice(0, -1) : token;
  return `…${inner.slice(-6)}]`;
};

const checkPushReceipts = internalAction({
  args: {
    tickets: v.array(
      v.object({
        id: v.string(),
        expoPushToken: v.string(),
      })
    ),
  },
  handler: async (ctx, { tickets }): Promise<null> => {
    try {
      if (tickets.length === 0) return null;

      let ok = 0;
      let error = 0;
      let missing = 0;

      for (const batch of chunk(tickets, EXPO_RECEIPTS_BATCH_SIZE)) {
        const response = await fetch(EXPO_RECEIPTS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          body: JSON.stringify({ ids: batch.map((ticket) => ticket.id) }),
        });

        if (!response.ok) {
          logError(
            "checkPushReceipts batch error",
            new Error(
              `Expo receipts API responded with status ${response.status}`
            )
          );
          continue;
        }

        const result = (await response.json()) as ExpoReceiptsResponse;
        const receipts = result.data ?? {};

        for (const ticket of batch) {
          const receipt = receipts[ticket.id];
          if (!receipt) {
            missing++;
            continue;
          }
          if (receipt.status === "ok") {
            ok++;
            continue;
          }

          error++;
          if (receipt.details?.error === "DeviceNotRegistered") {
            await ctx.runMutation(
              internal.notifications.sendPushNotification.deleteInvalidToken,
              { expoPushToken: ticket.expoPushToken }
            );
          } else {
            logError(
              "checkPushReceipts receipt error",
              new Error(
                `${receipt.details?.error ?? "UnknownError"}: ${
                  receipt.message ?? ""
                } (token ${maskPushToken(ticket.expoPushToken)})`
              )
            );
          }
        }
      }

      console.log(
        "checkPushReceipts summary",
        JSON.stringify({ total: tickets.length, ok, error, missing })
      );
      return null;
    } catch (error) {
      logError("checkPushReceipts error", error);
      return null;
    }
  },
});

export default checkPushReceipts;
