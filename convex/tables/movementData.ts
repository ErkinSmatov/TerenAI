import { defineTable } from "convex/server";
import { v } from "convex/values";

export const movementDataFields = {
  userId: v.id("users"),
  date: v.string(),
  steps: v.number(),
  activeEnergyKcal: v.number(),
  distanceMeters: v.number(),
};

export const movementData = defineTable(movementDataFields).index(
  "byUserIdAndDate",
  ["userId", "date"]
);
