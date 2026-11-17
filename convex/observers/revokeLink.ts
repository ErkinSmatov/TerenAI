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

const revokeLink = mutation({
  args: { linkId: v.id("observerLinks") },
  handler: async (ctx, { linkId }) => {
    try {
      const callerId = await getAuthUserId(ctx);
      if (callerId === null) throw new Error("Unauthorized");

      const link = await ctx.db.get(linkId);
      if (!link) return null;

      // Обязательная проверка участия по ОБЕИМ ролям — единственный
      // барьер от IDOR: любой аутентифицированный пользователь мог бы
      // разорвать чужую связь, зная/подобрав linkId.
      if (link.observerId !== callerId && link.patientId !== callerId) {
        throw new Error("Forbidden");
      }

      // Строки не удаляются (D-09): статус меняется у ВСЕХ строк пары, так как
      // дубликаты возможны (check-then-insert в redeemCode). assertObserverAccess
      // (collect + some active) теряет доступ сразу (LINK-03).
      const pairLinks = await loadPairLinks(ctx, link.observerId, link.patientId);
      const effective = pickEffectiveLink(pairLinks) ?? link;
      const actor = link.patientId === callerId ? "patient" : "observer";
      const now = Date.now();
      const result = resolveTransition({
        current: normalizeLinkStatus(effective.status),
        action: "revoke",
        actor,
        now,
      });
      if (result.kind === "forbidden") throw new Error("Forbidden");
      // noop: pending отзывом не трогается (пациент отклоняет, наблюдатель отменяет).
      if (result.kind === "apply") {
        await patchPairLinks(ctx, pairLinks, {
          status: "revoked",
          endedBy: actor,
          respondedAt: now,
        });
      }
      return null;
    } catch (error) {
      logError("revokeLink error", error);
      throw error;
    }
  },
});

export default revokeLink;
