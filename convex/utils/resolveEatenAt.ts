// Чистый модуль без зависимостей от convex/server — импортируется и
// Convex-мутациями, и ts-node verify-скриптами.
//
// D-07: дата приёма не может быть в будущем (допуск на рассинхрон часов
// клиента — 5 минут). Глубины в прошлое не ограничиваем.

export const MAX_CLOCK_SKEW_MS = 5 * 60_000;

export function resolveEatenAt(
  requested: number | undefined,
  now: number
): number {
  if (requested === undefined) return now;
  if (
    !Number.isFinite(requested) ||
    requested <= 0 ||
    requested > now + MAX_CLOCK_SKEW_MS
  ) {
    throw new Error("Invalid eatenAt");
  }
  return requested;
}
