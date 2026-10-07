import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

// Временная служебная функция проверки полноты бэкфилла между деплоями A и B
// (фаза 71). Запуск: `npx convex run meals/countMealsWithoutEatenAt '{}'`,
// далее с `{"cursor": "<continueCursor>"}` до `isDone: true` (с `--prod` для
// прода). internalQuery недоступна клиенту, возвращает только счётчики.
const countMealsWithoutEatenAt = internalQuery({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, numItems }) => {
    try {
      const { page, isDone, continueCursor } = await ctx.db
        .query("meals")
        .paginate({
          cursor: cursor ?? null,
          numItems: Math.min(numItems ?? 1000, 4000),
        });

      return {
        scanned: page.length,
        missing: page.filter((m) => m.eatenAt === undefined).length,
        isDone,
        continueCursor,
      };
    } catch (error) {
      logError("countMealsWithoutEatenAt error", error);
      throw error;
    }
  },
});

export default countMealsWithoutEatenAt;
