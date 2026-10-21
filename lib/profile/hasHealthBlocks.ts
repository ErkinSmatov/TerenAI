// Чистый модуль без зависимостей от convex/react.
// Программа влияет только на UI (D-06): блоки сахара и давления показываются
// для «Диабет» и «Биохакинг» (D-07). Хранимое значение glucometer остаётся
// прежним, в интерфейсе это «Диабет» (D-09).
export function hasHealthBlocks(goalTrack: string | undefined | null): boolean {
  return goalTrack === "glucometer" || goalTrack === "biohacking";
}
