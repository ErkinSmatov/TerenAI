import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import logError from "@/lib/utils/logError";

// В отличие от getCurrentUserName.ts (который подставляет email/phone/"Гость"
// для ОТОБРАЖЕНИЯ, когда реального имени нет), эта функция возвращает ТОЛЬКО
// реально заданное имя или null — нужна для поля ввода в EditNameSheet.tsx,
// чтобы не подставлять туда номер телефона/почту как будто это уже введённое
// пользователем имя.
const getCurrentUserRawName = query({
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) return null;

      const user = await ctx.db.get(userId);
      return user?.name ?? null;
    } catch (error) {
      logError("getCurrentUserRawName error", error);
      throw error;
    }
  },
});

export default getCurrentUserRawName;
