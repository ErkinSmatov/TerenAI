import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { computeStreakFromMealTimes } from "../utils/streakDays";
import { resolveNewBadges } from "@/lib/badges/badgeDefinitions";
import logError from "@/lib/utils/logError";

// internalMutation — не публичная мутация: начисление бейджей обязано быть
// достижимым только из доверенного серверного пайплайна (T-69-14).
const checkAndAwardBadges = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }): Promise<null> => {
    try {
      // Клиентского контекста в этот момент нет (фоновый пайплайн, Phase 7),
      // поэтому единственный источник локального времени пользователя —
      // последний сохранённый push-токен (69-RESEARCH.md Pattern 1, A1).
      const pushToken = await ctx.db
        .query("pushTokens")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .first();
      const offset = pushToken?.timezoneOffsetMinutes ?? 0;

      const meals = await ctx.db
        .query("meals")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .order("desc")
        .filter((q) => q.eq(q.field("status"), "done"))
        .collect();

      const mealCount = meals.length;
      const streak = computeStreakFromMealTimes(
        meals.map((meal) => meal._creationTime),
        Date.now(),
        offset
      );

      const awarded = await ctx.db
        .query("badges")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .collect();

      const newBadges = resolveNewBadges({
        streak,
        mealCount,
        awarded: awarded.map((badge) => ({
          type: badge.type,
          threshold: badge.threshold,
        })),
      });

      for (const badgeDefinition of newBadges) {
        // Вторая линия защиты от гонки (T-69-12): два блюда одного
        // пользователя могут завершиться почти одновременно.
        const existing = await ctx.db
          .query("badges")
          .withIndex("byUserIdAndTypeAndThreshold", (q) =>
            q
              .eq("userId", userId)
              .eq("type", badgeDefinition.type)
              .eq("threshold", badgeDefinition.threshold)
          )
          .first();
        if (existing) continue;

        await ctx.db.insert("badges", {
          userId,
          type: badgeDefinition.type,
          threshold: badgeDefinition.threshold,
          earnedAt: Date.now(),
        });
      }

      return null;
    } catch (error) {
      logError("checkAndAwardBadges error", error);
      throw error;
    }
  },
});

export default checkAndAwardBadges;
