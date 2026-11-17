import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "@/lib/utils/logError";
import {
  normalizeLinkStatus,
  pickEffectiveLink,
  resolveTransition,
} from "@/lib/observers/linkStatus";
import { loadPairLinks, patchPairLinks } from "./utils/pairLinks";

// D-07: наблюдатель отменяет свой запрос в любой момент до ответа пациента.
const cancelRequest = mutation({
  args: { linkId: v.id("observerLinks") },
  handler: async (ctx, { linkId }) => {
    try {
      const callerId = await getAuthUserId(ctx);
      if (callerId === null) throw new Error("Unauthorized");

      const link = await ctx.db.get(linkId);
      if (!link) return null;

      if (link.observerId !== callerId) throw new Error("Forbidden");

      const pairLinks = await loadPairLinks(ctx, link.observerId, link.patientId);
      const effective = pickEffectiveLink(pairLinks) ?? link;
      const now = Date.now();

      const result = resolveTransition({
        current: normalizeLinkStatus(effective.status),
        action: "cancel",
        actor: "observer",
        now,
      });
      if (result.kind === "forbidden") throw new Error("Forbidden");
      if (result.kind === "apply") {
        // Допущение A6: отдельного статуса cancelled нет, хранится revoked.
        await patchPairLinks(ctx, pairLinks, {
          status: "revoked",
          endedBy: "observer",
          respondedAt: now,
        });
      }
      return null;
    } catch (error) {
      logError("cancelRequest error", error);
      throw error;
    }
  },
});

export default cancelRequest;
