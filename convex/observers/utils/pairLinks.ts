import type { WithoutSystemFields } from "convex/server";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

// Пара может иметь несколько строк из-за исторического check-then-insert,
// поэтому все переходы применяются ко всем строкам пары.
export async function loadPairLinks(
  ctx: QueryCtx,
  observerId: Id<"users">,
  patientId: Id<"users">,
): Promise<Doc<"observerLinks">[]> {
  return await ctx.db
    .query("observerLinks")
    .withIndex("byObserverAndPatient", (q) =>
      q.eq("observerId", observerId).eq("patientId", patientId),
    )
    .collect();
}

export async function patchPairLinks(
  ctx: MutationCtx,
  links: Doc<"observerLinks">[],
  patch: Partial<WithoutSystemFields<Doc<"observerLinks">>>,
): Promise<void> {
  for (const link of links) {
    await ctx.db.patch(link._id, patch);
  }
}
