import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Единственный шлюз кросс-пользовательского чтения в проекте.
 *
 * Любая новая observer-функция, читающая данные ЧУЖОГО пользователя,
 * обязана начинаться с вызова этого helper'а — до первого
 * ctx.db.query/ctx.db.get по данным пациента. Функция выводит
 * observerId только из сессии (никогда не принимает его аргументом)
 * и бросает исключение вместо возврата boolean, чтобы вызывающий не
 * мог тихо проигнорировать результат проверки. Это единственная точка
 * ревью безопасности для BOLA/IDOR на этой поверхности.
 */
export async function assertObserverAccess(
  ctx: QueryCtx | MutationCtx,
  targetUserId: Id<"users">
): Promise<Id<"users">> {
  const observerId = await getAuthUserId(ctx);
  if (observerId === null) throw new Error("Unauthorized");

  const link = await ctx.db
    .query("observerLinks")
    .withIndex("byObserverAndPatient", (q) =>
      q.eq("observerId", observerId).eq("patientId", targetUserId)
    )
    .first();
  if (!link) throw new Error("Forbidden");

  return observerId;
}
