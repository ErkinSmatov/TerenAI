import { defineTable } from "convex/server";
import { v } from "convex/values";

export const badgesFields = {
  userId: v.id("users"),
  // Литералы обязаны совпадать с BadgeType из lib/badges/badgeDefinitions.ts.
  type: v.union(v.literal("streak"), v.literal("mealCount")),
  threshold: v.number(),
  earnedAt: v.number(),
  seenAt: v.optional(v.number()),
};

export const badges = defineTable(badgesFields)
  .index("byUserId", ["userId"])
  // Проверка «уже выдан» перед вставкой (идемпотентность, T-69-04).
  .index("byUserIdAndTypeAndThreshold", ["userId", "type", "threshold"])
  // Запрос непоказанного бейджа в плане 69-04.
  .index("byUserIdAndSeenAt", ["userId", "seenAt"]);
