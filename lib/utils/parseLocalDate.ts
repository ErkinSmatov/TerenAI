// Чистый модуль без зависимостей от convex/react/react-native — импортируется
// и клиентом, и ts-node verify-скриптами.

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ParsedLocalDate = {
  target: Date;
  day: number;
};

// Разбор строки маршрута вручную, а не передачей строки напрямую в
// конструктор Date: для формата "YYYY-MM-DD" спецификация трактует строку
// как полночь UTC, из-за чего в отрицательных смещениях (Америка) экран
// показал бы предыдущий день.
// Восстановление даты обратно в строку и сравнение с исходной строкой —
// защита от «мусорных» календарных значений вроде «2026-02-31».
export function parseLocalDate(
  date: string | undefined
): ParsedLocalDate | null {
  if (!date || !DATE_PARAM_PATTERN.test(date)) return null;

  const [year, month, day] = date.split("-").map(Number);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  const target = new Date(year, month - 1, day);
  if (Number.isNaN(target.getTime())) return null;

  if (toLocalDateString(target) !== date) return null;

  return { target, day };
}

export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function localMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function isFutureLocalDay(target: Date, now: number): boolean {
  return localMidnight(target) > localMidnight(new Date(now));
}

export function isSameLocalDay(target: Date, now: number): boolean {
  return localMidnight(target) === localMidnight(new Date(now));
}

// D-07: null для некорректной строки и для дня в будущем.
export function resolveAddDate(
  date: string | undefined,
  now: number
): { date: string; target: Date; isToday: boolean } | null {
  const parsed = parseLocalDate(date);
  if (!parsed || date === undefined) return null;
  if (isFutureLocalDay(parsed.target, now)) return null;
  return {
    date,
    target: parsed.target,
    isToday: isSameLocalDay(parsed.target, now),
  };
}
