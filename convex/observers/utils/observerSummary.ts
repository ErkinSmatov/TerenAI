import type { QueryCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { resolveDoctorBadge } from "@/lib/observers/linkStatus";

/**
 * Отображаемое имя наблюдателя и пометка врача.
 * Пометка «Врач · Клиника» решается только здесь, на сервере; клиент лишь
 * отрисовывает. Наружу уходит только { clinic } для verified-врача.
 */
export async function resolveObserverSummary(
  ctx: QueryCtx,
  observerId: Id<"users">
): Promise<{ displayName: string; doctor: { clinic: string } | null } | null> {
  const observer = await ctx.db.get(observerId);
  if (!observer) return null;

  const displayName =
    [observer.name, observer.email, observer.phone].find((value): value is string =>
      Boolean(value)
    ) ?? "Гость";

  const doctorRow = await ctx.db
    .query("doctors")
    .withIndex("byUserId", (q) => q.eq("userId", observerId))
    .first();

  const doctor = resolveDoctorBadge(
    doctorRow ? { status: doctorRow.status, clinic: doctorRow.clinic } : null
  );

  return { displayName, doctor };
}
