// Чистый модуль без зависимостей от convex/react/react-native — импортируется
// и клиентом, и Convex, и ts-node verify-скриптами.
//
// Fallback на `_creationTime` оставляем постоянно (защита от строк, не
// прошедших бэкфилл) — фаза 71, D-10.
export function getMealTime(meal: {
  _creationTime: number;
  eatenAt?: number;
}): number {
  return meal.eatenAt ?? meal._creationTime;
}
