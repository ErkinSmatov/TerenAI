import { defineTable } from "convex/server";
import { v } from "convex/values";

export const glucoseReadingsFields = {
  userId: v.id("users"),
  value: v.number(),
  unit: v.union(v.literal("mmol/L"), v.literal("mg/dL")),
  context: v.optional(
    v.union(
      v.literal("fasting"),
      v.literal("beforeMeal"),
      v.literal("afterMeal"),
      v.literal("random")
    )
  ),
};

export const glucoseReadings = defineTable(glucoseReadingsFields).index(
  "byUserId",
  ["userId"]
);
