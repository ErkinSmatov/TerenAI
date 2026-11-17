import { query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "@/lib/utils/logError";
import { isActiveLink, pickEffectiveLink } from "@/lib/observers/linkStatus";
import { resolveObserverSummary } from "./utils/observerSummary";

const getMyObservers = query({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      // Выборка своей стороны связи (вызывающий — patientId): это не
      // кросс-пользовательский доступ, поэтому кросс-пользовательский
      // шлюз здесь не требуется.
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

      const resolved = await Promise.all(
        [...groups.values()].map(async (group) => {
          const effective = pickEffectiveLink(group);
          // pending сюда не попадают — они в getIncomingRequests.
          if (!effective || !isActiveLink(effective)) return null;

          const summary = await resolveObserverSummary(ctx, effective.observerId);
          if (!summary) return null;

          return {
            linkId: effective._id,
            observerId: effective.observerId,
            displayName: summary.displayName,
            linkedAt: effective.confirmedAt ?? effective._creationTime,
            doctor: summary.doctor,
          };
        })
      );

      return resolved
        .filter((observer): observer is NonNullable<typeof observer> => observer !== null)
        .sort((a, b) => b.linkedAt - a.linkedAt);
    } catch (error) {
      logError("getMyObservers error", error);
      throw error;
    }
  },
});

export default getMyObservers;
