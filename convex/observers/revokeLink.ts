import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "@/lib/utils/logError";

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

      // Удаляем ВСЕ строки для этой пары (observerId, patientId), а не
      // только linkId: redeemCode не гарантирует уникальность на уровне
      // схемы (check-then-insert), и гонка конкурентных редемпшенов может
      // создать дубликат. Если отозвать только по linkId, assertObserverAccess
      // найдёт уцелевший дубликат через .first() — отзыв станет фиктивным.
      const pairLinks = await ctx.db
        .query("observerLinks")
        .withIndex("byObserverAndPatient", (q) =>
          q.eq("observerId", link.observerId).eq("patientId", link.patientId)
        )
        .collect();
      for (const duplicate of pairLinks) {
        await ctx.db.delete(duplicate._id);
      }
      return null;
    } catch (error) {
      logError("revokeLink error", error);
      throw error;
    }
  },
});

export default revokeLink;
