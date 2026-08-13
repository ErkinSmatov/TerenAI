import { defineTable } from "convex/server";
import { v } from "convex/values";

export const bloodPressureReadingsFields = {
  userId: v.id("users"),
  systolic: v.number(),
  diastolic: v.number(),
  pulse: v.optional(v.number()),
};

export const bloodPressureReadings = defineTable(
  bloodPressureReadingsFields
).index("byUserId", ["userId"]);
