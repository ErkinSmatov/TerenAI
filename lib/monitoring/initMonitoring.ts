// Side-effect модуль: инициализация выполняется при импорте, ничего не
// экспортируется. Так порядок гарантируется порядком импортов и не зависит от
// того, вызовет ли кто-то функцию.
//
// ВАЖНО: этот модуль не бросает исключений ни в одной ветке. Уронить приложение
// из-за отсутствия системы отчётов об ошибках — ровно та ошибка, которая
// сгубила сборку 1.2.1 (1) (throw на уровне модуля в RootLayoutProvider.tsx).

import * as Sentry from "@sentry/react-native";
import { setErrorReporter } from "@/lib/utils/errorReporter";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

function toError(message: string, error: unknown): Error {
  if (error instanceof Error) return error;

  let serialized: string;
  try {
    serialized = JSON.stringify(error);
  } catch {
    // JSON.stringify бросает на циклических структурах.
    serialized = String(error);
  }

  return new Error(`${message}: ${serialized}`);
}

if (!dsn) {
  console.warn(
    "[monitoring] EXPO_PUBLIC_SENTRY_DSN не задан — отчёты об ошибках отключены"
  );
} else {
  Sentry.init({
    dsn,
    // В dev-клиенте события не шлём, чтобы не засорять проект шумом разработки.
    // Локальная Release-сборка даёт __DEV__ === false, поэтому проверка из
    // плана 01-04 отработает как надо.
    enabled: !__DEV__,
    // Запасное значение намеренно заметное: окружение "unknown" в дашборде
    // означает, что переменная не долетела до сборки.
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? "unknown",
    // Явно, хотя это и значение по умолчанию: приложение работает с фотографиями
    // еды и профилями питания, IP и данные пользователя в отчётах не нужны.
    sendDefaultPii: false,
    // Трассировка производительности вне объёма фазы: меньше движущихся частей
    // на стеке с New Architecture и React Compiler, меньше расход квоты.
    tracesSampleRate: 0,
    // Даёт статистику «сколько запусков закончилось крашем» — именно то, что
    // нужно для оценки стабильности TestFlight-сборки.
    enableAutoSessionTracking: true,
    debug: false,
  });

  setErrorReporter((message, error) => {
    Sentry.captureException(toError(message, error), {
      // Тег отличает перехваченные-и-залогированные ошибки от необработанных
      // крашей. В extra кладётся только короткий идентификатор операции из
      // вызова logError, но не аргументы функции и не содержимое документов.
      tags: { source: "logError" },
      extra: { logMessage: message },
    });
  });
}
