import { defineTable } from "convex/server";
import { v } from "convex/values";

export const pushTokensFields = {
  userId: v.id("users"),
  expoPushToken: v.string(),
  platform: v.union(v.literal("ios"), v.literal("android")),
  // Хранится здесь, а не только передаётся аргументом запроса: cron из
  // плана 69-07 отправляет push без клиентского запроса, и другого
  // источника локального времени пользователя у сервера нет
  // (69-RESEARCH.md Pattern 1).
  timezoneOffsetMinutes: v.number(),
  updatedAt: v.number(),
};

export const pushTokens = defineTable(pushTokensFields)
  .index("byUserId", ["userId"])
  // Нужен плану 69-07 для удаления токена по ответу DeviceNotRegistered.
  .index("byExpoPushToken", ["expoPushToken"]);
