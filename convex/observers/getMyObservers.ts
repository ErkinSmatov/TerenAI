import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import logError from "@/lib/utils/logError";

const getMyObservers = query({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      // Выборка своей стороны связи (вызывающий — patientId): это не
      // кросс-пользовательский доступ, поэтому кросс-пользовательский
      // шлюз здесь не требуется.
      const links = await ctx.db
        .query("observerLinks")
        .withIndex("byPatientId", (q) => q.eq("patientId", userId))
        .collect();

      const resolved = await Promise.all(
        links.map(async (link) => {
          const observer = await ctx.db.get(link.observerId);
          if (!observer) return null;

          const displayName =
            [observer.name, observer.email, observer.phone].find(
              (value): value is string => Boolean(value)
            ) ?? "Гость";

          return {
            linkId: link._id,
            observerId: link.observerId,
            displayName,
            linkedAt: link._creationTime,
          };
        })
      );

      return resolved
        .filter((observer): observer is NonNullable<typeof observer> => observer !== null)
        .sort((a, b) => b.linkedAt - a.linkedAt);
    } catch (error) {
      logError("getMyObservers error", error);
      throw error;
    }
  },
});

export default getMyObservers;
