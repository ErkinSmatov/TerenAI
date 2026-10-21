import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { pickLatestTokenRows } from "@/lib/notifications/tokenDedupe";
import logError from "@/lib/utils/logError";

// Разовая чистка дублей pushTokens (фаза 74). Запуск вручную:
//   npx convex run notifications/dedupeTokens:default '{"dryRun":true}'
// и с флагом --prod для production. Оставляется строка последнего вошедшего
// владельца устройства (максимальный updatedAt). Internal — с клиента не
// вызывается (ASVS V4).
const dedupeTokens = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    try {
      const rows = await ctx.db.query("pushTokens").collect();
      const { keep, remove } = pickLatestTokenRows(rows);

      if (dryRun !== true) {
        for (const row of remove) {
          await ctx.db.delete(row._id);
        }
      }

      const result = {
        totalRows: rows.length,
        uniqueTokens: keep.length,
        duplicateRows: remove.length,
        deleted: dryRun === true ? 0 : remove.length,
      };
      console.log("dedupeTokens result", JSON.stringify(result));
      return result;
    } catch (error) {
      logError("dedupeTokens error", error);
      throw error;
    }
  },
});

export default dedupeTokens;
