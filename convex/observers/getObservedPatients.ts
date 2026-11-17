import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { hasHealthBlocks } from "@/lib/profile/hasHealthBlocks";
import { localDayBoundaries } from "../utils/localDayBoundaries";
import { isGlucoseOutOfRange, isCaloriesExceeded } from "./utils/thresholds";
import {
  isActiveLink,
  isPendingExpired,
  normalizeLinkStatus,
  pickEffectiveLink,
} from "@/lib/observers/linkStatus";

function resolveDisplayName(user: {
  name?: string;
  email?: string;
  phone?: string;
}): string {
  return user.name ?? user.email ?? user.phone ?? "Гость";
}

const getObservedPatients = query({
  args: {
    timezoneOffsetMinutes: v.number(),
    // Клиенты до фазы 78 не умеют рисовать заглушку pending (краш на 1.2.1(24)),
    // поэтому pending отдаётся только тем, кто явно передал этот флаг.
    supportsPending: v.optional(v.boolean()),
  },
  handler: async (ctx, { timezoneOffsetMinutes, supportsPending }) => {
    try {
      const observerId = await getAuthUserId(ctx);
      if (observerId === null) throw new Error("Unauthorized");

      const links = await ctx.db
        .query("observerLinks")
        .withIndex("byObserverId", (q) => q.eq("observerId", observerId))
        .collect();

      const { startUtc, endUtc, dateString } = localDayBoundaries(
        Date.now(),
        timezoneOffsetMinutes
      );

      // Дубликаты пары (наблюдатель, пациент) схлопываются в одну эффективную
      // связь, чтобы не было двух карточек одного пациента.
      const groups = new Map<string, typeof links>();
      for (const link of links) {
        const key = String(link.patientId);
        const group = groups.get(key);
        if (group) group.push(link);
        else groups.set(key, [link]);
      }
      const effectiveLinks: typeof links = [];
      for (const group of groups.values()) {
        const effective = pickEffectiveLink(group);
        if (effective) effectiveLinks.push(effective);
      }

      const now = Date.now();

      type ActiveResult = {
        status: "active";
        patientId: Id<"users">;
        linkId: Id<"observerLinks">;
        displayName: string;
        mealsCount: number;
        caloriesTotal: number;
        caloriesTarget: number | null;
        isCaloriesExceeded: boolean;
        latestGlucose: {
          value: number;
          unit: "mmol/L" | "mg/dL";
          context?: "fasting" | "beforeMeal" | "afterMeal" | "random";
          recordedAt: number;
        } | null;
        isGlucoseOutOfRange: boolean;
        steps: number | null;
        distanceMeters: number | null;
        isGlucometerTrack: boolean;
        sortTime: number;
      };
      type PendingResult = {
        status: "pending";
        linkId: Id<"observerLinks">;
        requestedAt: number;
        sortTime: number;
      };
      const results: (ActiveResult | PendingResult)[] = [];

      for (const link of effectiveLinks) {
        const status = normalizeLinkStatus(link.status);
        if (status === "pending") {
          if (supportsPending !== true) continue; // старый клиент: pending не показываем
          const requestedAt = link.requestedAt ?? link._creationTime;
          if (isPendingExpired(requestedAt, now)) continue;
          // Код из 5 цифр можно подобрать, поэтому личность пациента до
          // подтверждения не раскрывается: ни имя, ни профиль, ни данные
          // не читаются (D-05, D-06).
          results.push({
            status: "pending",
            linkId: link._id,
            requestedAt,
            sortTime: requestedAt,
          });
          continue;
        }
        if (!isActiveLink(link)) continue; // declined, revoked, expired

        const patient = await ctx.db.get(link.patientId);
        if (!patient) continue; // связь с несуществующим пациентом — пропускаем

        const patientProfile = await ctx.db
          .query("profiles")
          .withIndex("byUserId", (q) => q.eq("userId", link.patientId))
          .first();

        const meals = await ctx.db
          .query("meals")
          .withIndex("byUserIdAndEatenAt", (q) =>
            q
              .eq("userId", link.patientId)
              .gte("eatenAt", startUtc)
              .lt("eatenAt", endUtc)
          )
          .filter((q) =>
            q.and(
              q.neq(q.field("status"), "error"),
              q.neq(q.field("status"), "deleted")
            )
          )
          .collect();

        const mealsCount = meals.length;
        const caloriesTotal = Math.round(
          meals.reduce(
            (sum, meal) => sum + (meal.totalMacros?.calories ?? 0),
            0
          )
        );

        const caloriesTarget = patientProfile?.targets.calories ?? null;
        const caloriesExceeded =
          caloriesTarget === null
            ? false
            : isCaloriesExceeded(caloriesTotal, caloriesTarget);

        const glucoseReadings = await ctx.db
          .query("glucoseReadings")
          .withIndex("byUserIdAndRecordedAt", (q) =>
            q
              .eq("userId", link.patientId)
              .gte("recordedAt", startUtc)
              .lt("recordedAt", endUtc)
          )
          .collect();

        let latestGlucose: ActiveResult["latestGlucose"] = null;
        for (const reading of glucoseReadings) {
          if (!latestGlucose || reading.recordedAt > latestGlucose.recordedAt) {
            latestGlucose = {
              value: reading.value,
              unit: reading.unit,
              context: reading.context,
              recordedAt: reading.recordedAt,
            };
          }
        }

        const glucoseOutOfRange = glucoseReadings.some((reading) =>
          isGlucoseOutOfRange(reading.value, reading.unit, reading.context)
        );

        const movementRow = await ctx.db
          .query("movementData")
          .withIndex("byUserIdAndDate", (q) =>
            q.eq("userId", link.patientId).eq("date", dateString)
          )
          .first();

        results.push({
          status: "active",
          patientId: link.patientId,
          linkId: link._id,
          displayName: resolveDisplayName(patient),
          mealsCount,
          caloriesTotal,
          caloriesTarget,
          isCaloriesExceeded: caloriesExceeded,
          latestGlucose,
          isGlucoseOutOfRange: glucoseOutOfRange,
          steps: movementRow?.steps ?? null,
          distanceMeters: movementRow?.distanceMeters ?? null,
          isGlucometerTrack: hasHealthBlocks(patientProfile?.data?.goalTrack),
          sortTime: link.confirmedAt ?? link._creationTime,
        });
      }

      results.sort((a, b) => b.sortTime - a.sortTime);

      return results.map(({ sortTime: _sortTime, ...rest }) => rest);
    } catch (error) {
      logError("getObservedPatients error", error);
      throw error;
    }
  },
});

export default getObservedPatients;
