import { defineTable } from "convex/server";
import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";

export const profilesFields = {
  userId: v.id("users"),
  targets: v.object({
    calories: v.number(),
    carbs: v.number(),
    protein: v.number(),
    fat: v.number(),
  }),
  isPro: v.optional(v.boolean()),
  hasCompletedOnboarding: v.boolean(),
  observerCode: v.optional(v.string()),
  // Опциональные поля: существующие профили не мигрируются, undefined
  // трактуется потребителями как «поле не заполнено» — для времени
  // обновления веса план 69-07 подставляет profile._creationTime,
  // для тумблеров напоминаний — значение по умолчанию true.
  weightUpdatedAt: v.optional(v.number()),
  weighInRemindersEnabled: v.optional(v.boolean()),
  mealRemindersEnabled: v.optional(v.boolean()),
  lastWeighInReminderSentAt: v.optional(v.number()),
  lastMealReminderSentAt: v.optional(v.number()),
  // Фаза 74: undefined = включено / не отправлялось, миграции нет.
  // Тумблер возвратных push RET-01..03.
  retentionRemindersEnabled: v.optional(v.boolean()),
  lastRetentionReminderStage: v.optional(v.number()),
  lastRetentionReminderSentAt: v.optional(v.number()),
  // FOOD-01: не более 2 в локальные сутки.
  foodReminderCounter: v.optional(
    v.object({ dayStartUtcMs: v.number(), count: v.number() })
  ),
  // Классы C и D вместе: не более 3 в локальные сутки.
  limitedPushCounter: v.optional(
    v.object({ dayStartUtcMs: v.number(), count: v.number() })
  ),
  // Индексы последних текстов для ротации без повтора подряд.
  lastFoodReminderTextIndex: v.optional(v.number()),
  lastWeighInReminderTextIndex: v.optional(v.number()),
  // Кнопка «Пропускаю» у FOOD-01.
  lastMealSkip: v.optional(
    v.object({
      pointId: v.union(
        v.literal("breakfast"),
        v.literal("lunch"),
        v.literal("dinner")
      ),
      dayStartUtcMs: v.number(),
    })
  ),
  data: v.optional(
    v.object({
      measurementSystem: v.union(v.literal("metric"), v.literal("imperial")),
      sex: v.union(v.literal("male"), v.literal("female")),
      birthDate: v.number(),
      height: v.number(),
      weight: v.number(),
      weeklyWorkouts: v.union(
        v.literal("0-2"),
        v.literal("3-5"),
        v.literal("6+")
      ),
      activityLevel: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      ),
      liftingExperience: v.union(
        v.literal("none"),
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      ),
      cardioExperience: v.union(
        v.literal("none"),
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      ),
      goalTrack: v.union(
        v.literal("biohacking"),
        v.literal("glucometer"),
        v.literal("weightControl")
      ),
      glucometerType: v.optional(
        v.union(
          v.literal("diabetes1"),
          v.literal("diabetes2"),
          v.literal("sugarControl")
        )
      ),
      goal: v.union(
        v.literal("lose"),
        v.literal("maintain"),
        v.literal("gain")
      ),
      targetWeight: v.number(),
      weightChangeRate: v.number(),
      training: v.union(
        v.literal("none"),
        v.literal("lifting"),
        v.literal("cardio"),
        v.literal("both")
      ),
    })
  ),
};

export const profiles = defineTable(profilesFields)
  .index("byUserId", ["userId"])
  .index("byObserverCode", ["observerCode"]);

export type ProfileData = NonNullable<Doc<"profiles">["data"]>;
