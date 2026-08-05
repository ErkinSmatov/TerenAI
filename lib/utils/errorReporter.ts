// Реестр репортера ошибок.
//
// Этот файл обязан оставаться БЕЗ ЕДИНОГО ИМПОРТА: его через logError тянут за
// собой три несовместимых рантайма — клиент React Native, серверный V8-изолят
// Convex и Node-скрипты из scripts/. Любой импорт SDK Sentry для React Native
// или самого react-native здесь сломает деплой Convex и запуск скриптов импорта.
//
// Приёмник регистрирует только клиент (lib/monitoring/initMonitoring.ts).
// В Convex и в скриптах он остаётся null, и поведение logError там не меняется.
//
// Отступление от конвенции «одна функция на файл» намеренное: обе функции
// неразделимы, они делят одну приватную переменную уровня модуля.

export type ErrorReporter = (message: string, error: unknown) => void;

let reporter: ErrorReporter | null = null;

export function setErrorReporter(next: ErrorReporter | null): void {
  reporter = next;
}

export function getErrorReporter(): ErrorReporter | null {
  return reporter;
}
