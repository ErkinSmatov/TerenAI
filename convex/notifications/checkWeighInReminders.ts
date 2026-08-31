import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { isWeighInDue } from "@/lib/notifications/reminderSchedule";
import logError from "@/lib/utils/logError";

// Периодическая (см. convex/crons.ts) серверная проверка: кому пора напомнить
// о взвешивании. internalMutation, а не internalAction — метка отправки
// (`lastWeighInReminderSentAt`) должна проставляться в той же транзакции, что
// и формирование сообщения, иначе повторный тик cron в пределах того же окна
// снова пройдёт проверку (дедупликация, 69-RESEARCH.md Open Question 3).
// Сам сетевой вызов Expo Push API уходит отдельной запланированной задачей —
// прямой fetch из мутации невозможен.
const checkWeighInReminders = internalMutation({
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

        // undefined трактуется как «включено» — та же трактовка, что в
        // экране настроек плана 69-03 (`?? true`).
        if (profile.weighInRemindersEnabled === false) continue;

        // У профилей, созданных до этой фазы, поля weightUpdatedAt нет —
        // датой последнего взвешивания считается создание профиля.
        const weightUpdatedAtMs = profile.weightUpdatedAt ?? profile._creationTime;

        const due = isWeighInDue({
          nowUtcMs: now,
          timezoneOffsetMinutes: token.timezoneOffsetMinutes,
          weightUpdatedAtMs,
          lastReminderSentAtMs: profile.lastWeighInReminderSentAt,
        });
        if (!due) continue;

        messages.push({
          expoPushToken: token.expoPushToken,
          title: "Пора взвеситься",
          body: "Обновите вес — это займёт 10 секунд, а цели пересчитаются сами",
          data: { url: "/app/(settings)/weeklyWeighIn" },
        });

        // Метка ставится в той же транзакции, что и формирование сообщения,
        // до планирования отправки — обеспечивает дедупликацию при дрейфе
        // тика cron.
        await ctx.db.patch(profile._id, { lastWeighInReminderSentAt: now });
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
      logError("checkWeighInReminders error", error);
      throw error;
    }
  },
});

export default checkWeighInReminders;
