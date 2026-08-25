import * as Sentry from "@sentry/react-native";

// Диагностический хелпер для HEALTH-01. Sentry в dev-сборке отключён
// (`enabled: !__DEV__` в lib/monitoring/initMonitoring.ts), поэтому в dev
// единственный канал наблюдения — консоль; breadcrumb пишется всегда, чтобы
// прикрепиться к любому будущему событию из TestFlight-сборки.
//
// Функция обязана быть полностью безопасной: сбой системы наблюдаемости не
// должен ломать синхронизацию HealthKit (тот же принцип, что в logError.ts).
export function logHealthKitSync(
  stage: string,
  payload: Record<string, string | number>
): void {
  try {
    Sentry.addBreadcrumb({
      category: "healthkit",
      level: "info",
      message: stage,
      data: payload,
    });

    if (__DEV__) {
      console.log("[healthkit]", stage, payload);
    }
  } catch {
    // Намеренно проглочено — см. комментарий выше.
  }
}
