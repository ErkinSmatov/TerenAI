import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  isMealReminderDeduped,
  resolveDueMealPoint,
} from "@/lib/notifications/reminderSchedule";
import { computeStreakFromMealTimes } from "../utils/streakDays";
import logError from "@/lib/utils/logError";

// Периодическая (см. convex/crons.ts) серверная проверка: кому пора напомнить
// записать приём пищи. internalMutation по той же причине, что и
// checkWeighInReminders.ts — метка отправки должна проставляться атомарно с
// формированием сообщения.
const checkMealReminders = internalMutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    try {
      const now = Date.now();
      const tokens = await ctx.db.query("pushTokens").collect();

      const messages: {
        expoPushToken: string;
        title: string;
        body: string;
        data?: { url: string };
      }[] = [];

      for (const token of tokens) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("byUserId", (q) => q.eq("userId", token.userId))
          .first();
        if (!profile) continue;

        // undefined трактуется как «включено» — так же, как в Task 1.
        if (profile.mealRemindersEnabled === false) continue;

        const point = resolveDueMealPoint({
          nowUtcMs: now,
          timezoneOffsetMinutes: token.timezoneOffsetMinutes,
        });
        if (!point) continue;

        if (isMealReminderDeduped(now, profile.lastMealReminderSentAt)) {
          continue;
        }

        // D-12: «уже записан приём пищи» определяется попаданием любого
        // неудалённого блюда во временное окно точки, а не классификацией по
        // типу приёма пищи — в схеме meals такого поля нет и не вводится.
        const existingMeal = await ctx.db
          .query("meals")
          .withIndex("byUserId", (q) =>
            q
              .eq("userId", token.userId)
              .gte("_creationTime", point.windowStartUtcMs)
              .lt("_creationTime", point.windowEndUtcMs)
          )
          .filter((q) => q.neq(q.field("status"), "deleted"))
          .first();
        if (existingMeal) continue;

        // Стрик считается только для пользователей, прошедших все
        // предыдущие отсечки — единицы записей за тик, а не полная таблица.
        const doneMeals = await ctx.db
          .query("meals")
          .withIndex("byUserId", (q) => q.eq("userId", token.userId))
          .order("desc")
          .filter((q) => q.eq(q.field("status"), "done"))
          .collect();
        const streak = computeStreakFromMealTimes(
          doneMeals.map((meal) => meal._creationTime),
          now,
          token.timezoneOffsetMinutes
        );

        let title: string;
        let body: string;
        if (point.id === "breakfast") {
          title = "Не забудьте позавтракать";
          body =
            streak === 0
              ? "Запишите приём пищи, чтобы начать серию"
              : `Запишите приём пищи — сегодня ваш стрик ${streak} дней, не теряйте его`;
        } else if (point.id === "lunch") {
          title = "Пора обедать?";
          body =
            streak === 0
              ? "Запишите приём пищи, чтобы начать серию"
              : `Запишите приём пищи, чтобы сохранить стрик ${streak} дней`;
        } else {
          title = "Ужин ещё не записан";
          body =
            streak === 0
              ? "Запишите приём пищи, чтобы начать серию"
              : `Отметьте приём пищи — стрик ${streak} дней ждёт продолжения`;
        }

        messages.push({
          expoPushToken: token.expoPushToken,
          title,
          body,
          data: { url: "/app" },
        });

        await ctx.db.patch(profile._id, { lastMealReminderSentAt: now });
      }

      if (messages.length > 0) {
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.sendPushNotification.default,
          { messages }
        );
      }

      return null;
    } catch (error) {
      logError("checkMealReminders error", error);
      throw error;
    }
  },
});

export default checkMealReminders;
