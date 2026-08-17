import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { rateLimiter } from "../rateLimit";

const CODE_FORMAT = /^\d{5}$/;

const redeemCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, { code }): Promise<Id<"observerLinks">> => {
    try {
      const observerId = await getAuthUserId(ctx);
      if (observerId === null) throw new Error("Unauthorized");

      // Валидация формы кода до любого обращения к базе — та же ошибка,
      // что и при отсутствии кода, чтобы ответ не позволял отличить
      // «неверный формат» от «нет такого кода».
      if (!CODE_FORMAT.test(code)) throw new Error("Code not found");

      // Два независимых лимита, оба до поиска профиля:
      // - по observerId — ограничивает одного вызывающего;
      // - по самому коду — ограничивает попытки против ОДНОГО кода
      //   независимо от числа аккаунтов, которыми его перебирают
      //   (5-значный код — 100 000 значений, per-account лимит один
      //   тривиально обходится созданием новых аккаунтов).
      await rateLimiter.limit(ctx, "observerCodeRedeem", {
        key: observerId,
        throws: true,
      });
      await rateLimiter.limit(ctx, "observerCodeGuess", {
        key: code,
        throws: true,
      });

      const patientProfile = await ctx.db
        .query("profiles")
        .withIndex("byObserverCode", (q) => q.eq("observerCode", code))
        .first();
      if (!patientProfile) throw new Error("Code not found");

      const patientId = patientProfile.userId;
      if (patientId === observerId) {
        throw new Error("Cannot observe yourself");
      }

      const existingLink = await ctx.db
        .query("observerLinks")
        .withIndex("byObserverAndPatient", (q) =>
          q.eq("observerId", observerId).eq("patientId", patientId)
        )
        .first();
      if (existingLink) return existingLink._id; // идемпотентно

      return await ctx.db.insert("observerLinks", { observerId, patientId });
    } catch (error) {
      logError("redeemCode error", error);
      throw error;
    }
  },
});

export default redeemCode;
