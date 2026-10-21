import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  getLocalParts,
  isMealReminderDeduped,
  resolveDueMealPoint,
  type MealPointId,
} from "@/lib/notifications/reminderSchedule";
import {
  FOOD_REMINDER_DAILY_MAX,
  LIMITED_PUSH_CLASSES,
  LIMITED_PUSH_DAILY_MAX,
  RETENTION_SLOT_HOUR,
  canSendWithDailyLimit,
  incrementDailyCounter,
  isDormant,
  isInLocalSlot,
  isQuietHours,
  isWeeklyWeighInDue,
  pickRotatedTextIndex,
  resolveRetentionStage,
  validatePushCopy,
} from "@/lib/notifications/pushRules";
import {
  PUSH_CATALOG,
  getFoodReminderVariantIndexes,
  renderPushText,
  type PushId,
} from "@/lib/notifications/pushCatalog";
import { pickLatestTokenRows } from "@/lib/notifications/tokenDedupe";
import logError from "@/lib/utils/logError";

// Единая периодическая (см. convex/crons.ts) серверная проверка всех
// запланированных push: FOOD-01, HLT-14, RET-01..03. internalMutation, а не
// internalAction — метки отправки и счётчики должны проставляться атомарно с
// формированием сообщения (как в прежних отдельных проверках еды и
// взвешивания): иначе повторный тик cron в том же окне снова
// пройдёт проверку. Сетевой вызов Expo Push API уходит отдельной задачей.
//
// Один проход вместо нескольких — последняя линия защиты от дублей
// (Pitfall 6): на устройство (expoPushToken) за тик уходит не более одного
// push, приоритет FOOD-01 → HLT-14 → RET.

type PushMessage = {
  expoPushToken: string;
  title: string;
  body: string;
  data?: { url: string; mealPoint?: MealPointId };
  categoryId?: string;
};

const FOOD_CATEGORY_ID = "food-reminder";

const checkScheduledPushes = internalMutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    try {
      const now = Date.now();
      const tokens = await ctx.db.query("pushTokens").collect();

      // D-13: дедуп по токену до чтения профилей — адресат дубля
      // устройства — последний вошедший пользователь.
      const { keep: uniqueTokens, remove } = pickLatestTokenRows(tokens);

      const messages: PushMessage[] = [];
      const counts: Record<PushId, number> = {
        "FOOD-01": 0,
        "HLT-14": 0,
        "RET-01": 0,
        "RET-02": 0,
        "RET-03": 0,
      };

      for (const token of uniqueTokens) {
        const tz = token.timezoneOffsetMinutes;

        // Правило 3: тихие часы 22:00–08:00.
        if (isQuietHours(now, tz)) continue;

        const profile = await ctx.db
          .query("profiles")
          .withIndex("byUserId", (q) => q.eq("userId", token.userId))
          .first();
        if (!profile) continue;

        const { localDayStartUtcMs } = getLocalParts(now, tz);
        const dormant = isDormant(now, token.updatedAt);

        // Имя читается лениво, только если текст его использует.
        let cachedName: string | null | undefined;
        const getName = async (): Promise<string | null> => {
          if (cachedName === undefined) {
            const user = await ctx.db.get(token.userId);
            cachedName = user?.name ?? null;
          }
          return cachedName;
        };

        // Рендер с проверкой правил 9–10; при ошибке — повтор без имени.
        const renderChecked = async (
          id: PushId,
          template: string,
          mealPointId?: MealPointId
        ): Promise<{ title: string; body: string } | null> => {
          const title = PUSH_CATALOG[id].title;
          const usesName = template.includes("{имя}");
          let body = renderPushText(template, {
            name: usesName ? await getName() : null,
            mealPointId,
          });
          let check = validatePushCopy(title, body);
          if (!check.ok && usesName) {
            body = renderPushText(template, { name: null, mealPointId });
            check = validatePushCopy(title, body);
          }
          if (!check.ok) {
            logError(
              `checkScheduledPushes copy invalid ${id}`,
              new Error(check.errors.join("; "))
            );
            return null;
          }
          return { title, body };
        };

        const countsTowardLimit = (id: PushId) =>
          LIMITED_PUSH_CLASSES.includes(PUSH_CATALOG[id].pushClass);
        const limitedOk = (id: PushId) =>
          !countsTowardLimit(id) ||
          canSendWithDailyLimit(
            profile.limitedPushCounter,
            localDayStartUtcMs,
            LIMITED_PUSH_DAILY_MAX
          );

        // (1) FOOD-01
        if (!dormant && profile.mealRemindersEnabled !== false) {
          const point = resolveDueMealPoint({
            nowUtcMs: now,
            timezoneOffsetMinutes: tz,
          });
          const skipped =
            profile.lastMealSkip?.pointId === point?.id &&
            profile.lastMealSkip?.dayStartUtcMs === localDayStartUtcMs;
          if (
            point &&
            !skipped &&
            !isMealReminderDeduped(now, profile.lastMealReminderSentAt) &&
            canSendWithDailyLimit(
              profile.foodReminderCounter,
              localDayStartUtcMs,
              FOOD_REMINDER_DAILY_MAX
            ) &&
            limitedOk("FOOD-01")
          ) {
            // D-12: «уже записан приём пищи» — любое неудалённое блюдо в
            // окне точки; по eatenAt, чтобы блюдо задним числом не гасило
            // сегодняшнее напоминание.
            const existingMeal = await ctx.db
              .query("meals")
              .withIndex("byUserIdAndEatenAt", (q) =>
                q
                  .eq("userId", token.userId)
                  .gte("eatenAt", point.windowStartUtcMs)
                  .lt("eatenAt", point.windowEndUtcMs)
              )
              .filter((q) => q.neq(q.field("status"), "deleted"))
              .first();
            if (!existingMeal) {
              const index = pickRotatedTextIndex(
                getFoodReminderVariantIndexes(point.id),
                profile.lastFoodReminderTextIndex
              );
              const copy = await renderChecked(
                "FOOD-01",
                PUSH_CATALOG["FOOD-01"].texts[index],
                point.id
              );
              if (copy) {
                messages.push({
                  expoPushToken: token.expoPushToken,
                  ...copy,
                  data: { url: PUSH_CATALOG["FOOD-01"].url, mealPoint: point.id },
                  categoryId: FOOD_CATEGORY_ID,
                });
                await ctx.db.patch(profile._id, {
                  lastMealReminderSentAt: now,
                  foodReminderCounter: incrementDailyCounter(
                    profile.foodReminderCounter,
                    localDayStartUtcMs
                  ),
                  lastFoodReminderTextIndex: index,
                  ...(countsTowardLimit("FOOD-01")
                    ? {
                        limitedPushCounter: incrementDailyCounter(
                          profile.limitedPushCounter,
                          localDayStartUtcMs
                        ),
                      }
                    : {}),
                });
                counts["FOOD-01"] += 1;
                continue;
              }
            }
          }
        }

        // (2) HLT-14
        if (
          !dormant &&
          profile.weighInRemindersEnabled !== false &&
          limitedOk("HLT-14") &&
          isWeeklyWeighInDue({
            nowUtcMs: now,
            timezoneOffsetMinutes: tz,
            // У профилей без поля датой взвешивания считается создание.
            weightUpdatedAtMs: profile.weightUpdatedAt ?? profile._creationTime,
            lastReminderSentAtMs: profile.lastWeighInReminderSentAt,
          })
        ) {
          const index = pickRotatedTextIndex(
            [0, 1],
            profile.lastWeighInReminderTextIndex
          );
          const copy = await renderChecked(
            "HLT-14",
            PUSH_CATALOG["HLT-14"].texts[index]
          );
          if (copy) {
            messages.push({
              expoPushToken: token.expoPushToken,
              ...copy,
              data: { url: PUSH_CATALOG["HLT-14"].url },
            });
            await ctx.db.patch(profile._id, {
              lastWeighInReminderSentAt: now,
              lastWeighInReminderTextIndex: index,
              ...(countsTowardLimit("HLT-14")
                ? {
                    limitedPushCounter: incrementDailyCounter(
                      profile.limitedPushCounter,
                      localDayStartUtcMs
                    ),
                  }
                : {}),
            });
            counts["HLT-14"] += 1;
            continue;
          }
        }

        // (3) RET-01..03: класс D, входит в лимит 3 в сутки.
        if (
          profile.retentionRemindersEnabled !== false &&
          isInLocalSlot(now, tz, RETENTION_SLOT_HOUR)
        ) {
          const stage = resolveRetentionStage({
            nowUtcMs: now,
            lastActiveAtMs: token.updatedAt,
            lastSentStage: profile.lastRetentionReminderStage,
            lastSentAtMs: profile.lastRetentionReminderSentAt,
          });
          if (stage !== null) {
            const id = `RET-0${stage}` as PushId;
            if (limitedOk(id)) {
              const copy = await renderChecked(id, PUSH_CATALOG[id].texts[0]);
              if (copy) {
                messages.push({
                  expoPushToken: token.expoPushToken,
                  ...copy,
                  data: { url: PUSH_CATALOG[id].url },
                });
                await ctx.db.patch(profile._id, {
                  lastRetentionReminderStage: stage,
                  lastRetentionReminderSentAt: now,
                  limitedPushCounter: incrementDailyCounter(
                    profile.limitedPushCounter,
                    localDayStartUtcMs
                  ),
                });
                counts[id] += 1;
              }
            }
          }
        }
      }

      if (messages.length > 0) {
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.sendPushNotification.default,
          { messages }
        );
      }

      // Только счётчики: без токенов и имён (T-74-16).
      console.log(
        "checkScheduledPushes done",
        JSON.stringify({
          tokens: tokens.length,
          droppedDuplicateTokens: remove.length,
          sent: messages.length,
          counts,
        })
      );

      return null;
    } catch (error) {
      logError("checkScheduledPushes error", error);
      throw error;
    }
  },
});

export default checkScheduledPushes;
