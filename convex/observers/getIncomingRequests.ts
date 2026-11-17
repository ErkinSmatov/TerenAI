import { query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "@/lib/utils/logError";
import {
  isPendingExpired,
  normalizeLinkStatus,
  pickEffectiveLink,
} from "@/lib/observers/linkStatus";
import { resolveObserverSummary } from "./utils/observerSummary";

const getIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      // Запрос смонтирован в HomeHeader и в модалке на главной: при выходе
      // из аккаунта он не должен ронять экран, поэтому возвращаем пустой список.
      if (userId === null) return [];

      // Своя сторона связи (patientId = вызывающий) — шлюз не требуется.
      const links = await ctx.db
        .query("observerLinks")
        .withIndex("byPatientId", (q) => q.eq("patientId", userId))
        .collect();

      const groups = new Map<Id<"users">, Doc<"observerLinks">[]>();
      for (const link of links) {
        const group = groups.get(link.observerId);
        if (group) group.push(link);
        else groups.set(link.observerId, [link]);
      }

      const now = Date.now();
      const resolved = await Promise.all(
        [...groups.values()].map(async (group) => {
          const effective = pickEffectiveLink(group);
          if (!effective || normalizeLinkStatus(effective.status) !== "pending") return null;

          const requestedAt = effective.requestedAt ?? effective._creationTime;
          // D-08: скрываем просроченные до срабатывания cron.
          if (isPendingExpired(requestedAt, now)) return null;

          // Пациенту раскрывается то же displayName, что в списке наблюдателей:
          // он должен понимать, кому даёт доступ.
          const summary = await resolveObserverSummary(ctx, effective.observerId);
          if (!summary) return null;

          return {
            linkId: effective._id,
            observerId: effective.observerId,
            displayName: summary.displayName,
            requestedAt,
            doctor: summary.doctor,
          };
        })
      );

      return resolved
        .filter((request): request is NonNullable<typeof request> => request !== null)
        .sort((a, b) => b.requestedAt - a.requestedAt);
    } catch (error) {
      logError("getIncomingRequests error", error);
      throw error;
    }
  },
});

export default getIncomingRequests;
