import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import logError from "@/lib/utils/logError";

// Тот же fallback-порядок, что и в convex/observers/getObservedPatients.ts
// (resolveDisplayName): name → email → phone → "Гость" — имя не обязательное
// поле на стандартной таблице auth-пользователей (@convex-dev/auth).
const getCurrentUserName = query({
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) return null;

      const user = await ctx.db.get(userId);
      if (!user) return null;

      return user.name ?? user.email ?? user.phone ?? "Гость";
    } catch (error) {
      logError("getCurrentUserName error", error);
      throw error;
    }
  },
});

export default getCurrentUserName;
