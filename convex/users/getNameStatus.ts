import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import logError from "@/lib/utils/logError";

// Статус имени для условия показа шага «Как вас зовут?» в онбординге.
// isAuthenticated нужен клиенту, чтобы отличить ответ для ещё
// неаутентифицированной сессии от «у пользователя нет имени».
// Возвращает только булевы флаги, без самого имени.
const getNameStatus = query({
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) return { isAuthenticated: false, hasName: false };

      const user = await ctx.db.get(userId);
      return {
        isAuthenticated: true,
        hasName: (user?.name ?? "").trim().length > 0,
      };
    } catch (error) {
      logError("getNameStatus error", error);
      throw error;
    }
  },
});

export default getNameStatus;
