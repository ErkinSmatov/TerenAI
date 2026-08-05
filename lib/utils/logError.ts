import { getErrorReporter } from "./errorReporter";

export default function logError(message: string, error: unknown) {
  // Прежнее поведение сохранено дословно. В Convex этот вывод попадает в логи
  // деплоймента — там это настоящая наблюдаемость, в отличие от релизного
  // бандла React Native, где console.error не идёт никуда.
  console.error(
    message,
    error instanceof Error ? error.message : "Unknown error"
  );

  // Репортер зарегистрирован только на клиенте. Сбой внутри него не должен
  // ломать обработку исходной ошибки: в Convex это оборвало бы транзакцию
  // мутации из-за отказа системы отчётов об ошибках.
  const reporter = getErrorReporter();
  if (reporter) {
    try {
      reporter(message, error);
    } catch {
      // Намеренно проглочено — см. комментарий выше.
    }
  }
}
