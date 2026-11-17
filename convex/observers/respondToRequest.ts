import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "@/lib/utils/logError";
import {
  isPendingExpired,
  normalizeLinkStatus,
  pickEffectiveLink,
  resolveTransition,
  type LinkStatus,
} from "@/lib/observers/linkStatus";
import { loadPairLinks, patchPairLinks } from "./utils/pairLinks";

const respondToRequest = mutation({
  args: {
    linkId: v.id("observerLinks"),
    decision: v.union(v.literal("accept"), v.literal("decline")),
  },
  handler: async (ctx, { linkId, decision }): Promise<{ status: LinkStatus } | null> => {
    try {
      const callerId = await getAuthUserId(ctx);
      if (callerId === null) throw new Error("Unauthorized");

      const link = await ctx.db.get(linkId);
      if (!link) return null;

      // Подтверждает или отклоняет только пациент (LINK-02, D-03).
      if (link.patientId !== callerId) throw new Error("Forbidden");

      const pairLinks = await loadPairLinks(ctx, link.observerId, link.patientId);
      const effective = pickEffectiveLink(pairLinks) ?? link;
      const current = normalizeLinkStatus(effective.status);
      const now = Date.now();

      // D-08: запрос старше 14 дней не подтверждается (cron работает раз в час).
      if (
        current === "pending" &&
        isPendingExpired(effective.requestedAt ?? effective._creationTime, now)
      ) {
        await patchPairLinks(ctx, pairLinks, { status: "expired" });
        return { status: "expired" as const };
      }

      const result = resolveTransition({ current, action: decision, actor: "patient", now });
      if (result.kind === "forbidden") throw new Error("Forbidden");
      if (result.kind !== "apply") return { status: current };

      // D-12: подтверждение открывает доступ целиком, без категорий.
      if (decision === "accept") {
        await patchPairLinks(ctx, pairLinks, {
          status: "active",
          confirmedAt: now,
          respondedAt: now,
        });
      } else {
        await patchPairLinks(ctx, pairLinks, { status: "declined", respondedAt: now });
      }
      return { status: result.next };
    } catch (error) {
      logError("respondToRequest error", error);
      throw error;
    }
  },
});

export default respondToRequest;
