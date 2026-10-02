import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

// Пользователи, вошедшие по телефону (WhatsApp/Telegram OTP), не получают
// `name` ни от одного провайдера — в отличие от Google/Apple, которые его
// присылают сами. Эта мутация даёт им (и всем остальным) возможность
// задать/отредактировать ФИО вручную из Профиля.
const updateUserName = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const trimmed = name.trim();
      if (trimmed.length === 0) {
        throw new Error("Имя не может быть пустым");
      }

      await ctx.db.patch(userId, { name: trimmed });
    } catch (error) {
      logError("updateUserName error", error);
      throw error;
    }
  },
});

export default updateUserName;
