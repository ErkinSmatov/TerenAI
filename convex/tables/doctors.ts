import { defineTable } from "convex/server";
import { v } from "convex/values";

// Минимальная таблица D-11: пишется только internal-мутацией. Расширение
// (2FA, клиники, роли) — Фаза 80.
export const doctorsFields = {
  userId: v.id("users"),
  fullName: v.string(),
  clinic: v.string(),
  status: v.union(v.literal("pending"), v.literal("verified")),
};

export const doctors = defineTable(doctorsFields).index("byUserId", ["userId"]);
