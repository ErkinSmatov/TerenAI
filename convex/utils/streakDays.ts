/**
 * Чистый подсчёт стрика (серии дней подряд с записанными приёмами пищи) по
 * временам создания блюд. Дословный перенос алгоритма из `convex/home/getStreak.ts`
 * без изменения поведения — вынесен сюда, чтобы быть доступным серверному
 * пайплайну начисления бейджей (`convex/badges/checkAndAwardBadges.ts`),
 * у которого нет авторизационного контекста `getAuthUserId`.
 *
 * Файл — чистая функция без импортов конвексовских автогенерируемых серверных
 * типов и без `convex/values`: она импортируется и из Convex-функций, и из
 * ad-hoc скрипта под `ts-node` (`scripts/verifyStreakDays.ts`).
 */

const dayMs = 24 * 60 * 60 * 1000;

export function computeStreakFromMealTimes(
  mealCreationTimesDesc: number[],
  nowUtcMs: number,
  timezoneOffsetMinutes: number
): number {
  if (mealCreationTimesDesc.length === 0) return 0;

  const offsetMs = timezoneOffsetMinutes * 60_000;
  const localNowMs = nowUtcMs - offsetMs;
  const todayLocalMidnight = Math.floor(localNowMs / dayMs) * dayMs;

  let streak = 0;
  let lastDateProcessed: number | null = null;

  for (const time of mealCreationTimesDesc) {
    const localMealTime = time - offsetMs;
    const mealDate = Math.floor(localMealTime / dayMs) * dayMs;

    if (lastDateProcessed === mealDate) {
      continue;
    }

    if (lastDateProcessed === null) {
      if (
        mealDate === todayLocalMidnight ||
        mealDate === todayLocalMidnight - dayMs
      ) {
        streak = 1;
        lastDateProcessed = mealDate;
      } else {
        return 0;
      }
    } else {
      if (mealDate === lastDateProcessed - dayMs) {
        streak++;
        lastDateProcessed = mealDate;
      } else {
        break;
      }
    }
  }

  return streak;
}
