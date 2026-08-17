import { mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "@/lib/utils/logError";
import { issueUniqueCode } from "./generateCode";

const regenerateCode = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const profile = await ctx.db
        .query("profiles")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .first();
      if (!profile) throw new Error("Profile not found");

      // Всегда выдаёт новый код. Существующие observerLinks не трогаем —
      // ротация закрывает будущие подключения по старому коду, но не рвёт
      // уже установленные связи (см. Task 3 / revokeLink для явного разрыва).
      return await issueUniqueCode(ctx, profile._id);
    } catch (error) {
      logError("regenerateCode error", error);
      throw error;
    }
  },
});

export default regenerateCode;
