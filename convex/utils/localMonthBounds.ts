/**
 * Валидация и раскладка по границам месяца, присланным клиентом.
 *
 * Клиент считает `dayCount + 1` отметок локальной полуночи (`dayStartsUtc`)
 * и `dayCount` локальных календарных дат (`monthDates`) сам, штатным
 * конструктором `new Date(year, month, day)`, который корректно разрешает
 * переход DST — в отличие от единственного смещения `getTimezoneOffset()`,
 * снятого один раз и применённого ко всем дням месяца. Сервер не может
 * пересчитать локальный календарь клиента самостоятельно, поэтому он лишь
 * валидирует присланные границы (длина, порядок, разумная ширина окна) и
 * раскладывает записи по ним — вся математика переходов остаётся на клиенте.
 *
 * Файл — чистые функции без импортов конвексовских автогенерируемых серверных
 * типов и без `convex/values`: он импортируется и из Convex-запросов, и из
 * ad-hoc скрипта под `ts-node` (`scripts/verifyMonthBucketing.ts`).
 */

const HOUR_MS = 60 * 60 * 1000;
const MIN_STEP_MS = 22 * HOUR_MS;
const MAX_STEP_MS = 26 * HOUR_MS;
const MIN_BOUNDS_LENGTH = 29; // 28 дней (невисокосный февраль) + 1 граница
const MAX_BOUNDS_LENGTH = 32; // 31 день + 1 граница
const MIN_DATES_LENGTH = 28;
const MAX_DATES_LENGTH = 31;
const MONTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertLocalMonthBounds(dayStartsUtc: number[]): void {
  if (
    dayStartsUtc.length < MIN_BOUNDS_LENGTH ||
    dayStartsUtc.length > MAX_BOUNDS_LENGTH
  ) {
    throw new Error("Invalid month bounds");
  }

  for (const ms of dayStartsUtc) {
    if (!Number.isFinite(ms) || !Number.isInteger(ms)) {
      throw new Error("Invalid month bounds");
    }
  }

  for (let i = 0; i < dayStartsUtc.length - 1; i++) {
    const step = dayStartsUtc[i + 1] - dayStartsUtc[i];
    if (step <= 0 || step < MIN_STEP_MS || step > MAX_STEP_MS) {
      throw new Error("Invalid month bounds");
    }
  }

  const dayCount = dayStartsUtc.length - 1;
  const minSpan = dayCount * 24 * HOUR_MS - 2 * HOUR_MS;
  const maxSpan = dayCount * 24 * HOUR_MS + 2 * HOUR_MS;
  const span = dayStartsUtc[dayStartsUtc.length - 1] - dayStartsUtc[0];
  if (span < minSpan || span > maxSpan) {
    throw new Error("Invalid month bounds");
  }
}

export function getLocalMonthDayIndex(
  dayStartsUtc: number[],
  timestampUtc: number
): number {
  for (let i = 0; i < dayStartsUtc.length - 1; i++) {
    if (timestampUtc >= dayStartsUtc[i] && timestampUtc < dayStartsUtc[i + 1]) {
      return i;
    }
  }
  return -1;
}

function parseMonthDateUtc(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function assertLocalMonthDates(monthDates: string[]): void {
  if (
    monthDates.length < MIN_DATES_LENGTH ||
    monthDates.length > MAX_DATES_LENGTH
  ) {
    throw new Error("Invalid month dates");
  }

  for (const date of monthDates) {
    if (!MONTH_DATE_PATTERN.test(date)) {
      throw new Error("Invalid month dates");
    }
  }

  for (let i = 0; i < monthDates.length - 1; i++) {
    if (monthDates[i] >= monthDates[i + 1]) {
      throw new Error("Invalid month dates");
    }
  }

  if (!monthDates[0].endsWith("-01")) {
    throw new Error("Invalid month dates");
  }

  const dayMs = 24 * HOUR_MS;
  const span =
    parseMonthDateUtc(monthDates[monthDates.length - 1]) -
    parseMonthDateUtc(monthDates[0]);
  if (span !== (monthDates.length - 1) * dayMs) {
    throw new Error("Invalid month dates");
  }
}
