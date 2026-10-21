// Чистая функция дедупа строк pushTokens: для каждого expoPushToken остаётся
// одна строка с максимальным updatedAt (последний вошедший владелец устройства).
export function pickLatestTokenRows<
  T extends { expoPushToken: string; updatedAt: number },
>(rows: T[]): { keep: T[]; remove: T[] } {
  const latest = new Map<string, T>();
  const remove: T[] = [];

  for (const row of rows) {
    const current = latest.get(row.expoPushToken);
    if (!current) {
      latest.set(row.expoPushToken, row);
    } else if (row.updatedAt > current.updatedAt) {
      remove.push(current);
      latest.set(row.expoPushToken, row);
    } else {
      remove.push(row);
    }
  }

  return { keep: Array.from(latest.values()), remove };
}
