import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { PENDING_EXPIRY_MS } from "@/lib/observers/linkStatus";
import logError from "@/lib/utils/logError";

const BATCH_SIZE = 200;

// D-08: переход pending -> expired делает только система (actor "system" в
// автомате статусов). Пачками по 200, продолжение планируется самой задачей.
const expirePendingLinks = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      const cutoff = Date.now() - PENDING_EXPIRY_MS;
      const batch = await ctx.db
        .query("observerLinks")
        .withIndex("byStatusAndRequestedAt", (q) =>
          q.eq("status", "pending").lt("requestedAt", cutoff)
        )
        .take(BATCH_SIZE);

      for (const link of batch) {
        await ctx.db.patch(link._id, { status: "expired" });
      }

      if (batch.length === BATCH_SIZE) {
        await ctx.scheduler.runAfter(
          0,
          internal.observers.expirePendingLinks.default,
          {}
        );
      }
      return null;
    } catch (error) {
      // Cron не должен падать повторно.
      logError("expirePendingLinks error", error);
      return null;
    }
  },
});

export default expirePendingLinks;
