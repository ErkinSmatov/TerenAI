/**
 * Валидация и раскладка по границам недели, присланным клиентом.
 *
 * Клиент считает 8 отметок локальной полуночи (`dayStartsUtc`) и 7 локальных
 * календарных дат (`weekDates`) сам, штатным конструктором `new Date(year, month, day)`,
 * который корректно разрешает переход DST — в отличие от единственного смещения
 * `getTimezoneOffset()`, снятого один раз и применённого ко всем семи дням недели.
 * Сервер не может пересчитать локальный календарь клиента самостоятельно, поэтому
 * он лишь валидирует присланные границы (длина, порядок, разумная ширина окна) и
 * раскладывает записи по ним — вся математика переходов остаётся на клиенте.
 *
 * Файл — чистые функции без импортов конвексовских автогенерируемых серверных
 * типов и без `convex/values`: он импортируется и из Convex-запросов, и из
 * ad-hoc скрипта под `ts-node` (`scripts/verifyWeekBucketing.ts`).
 */

const HOUR_MS = 60 * 60 * 1000;
const MIN_STEP_MS = 22 * HOUR_MS;
const MAX_STEP_MS = 26 * HOUR_MS;
const MIN_SPAN_MS = 7 * 24 * HOUR_MS - 2 * HOUR_MS;
const MAX_SPAN_MS = 7 * 24 * HOUR_MS + 2 * HOUR_MS;
const SIX_DAYS_MS = 6 * 24 * HOUR_MS;
const WEEK_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertLocalWeekBounds(dayStartsUtc: number[]): void {
  if (dayStartsUtc.length !== 8) {
    throw new Error("Invalid week bounds");
  }

  for (const ms of dayStartsUtc) {
    if (!Number.isFinite(ms) || !Number.isInteger(ms)) {
      throw new Error("Invalid week bounds");
    }
  }

  for (let i = 0; i < dayStartsUtc.length - 1; i++) {
    const step = dayStartsUtc[i + 1] - dayStartsUtc[i];
    if (step <= 0 || step < MIN_STEP_MS || step > MAX_STEP_MS) {
      throw new Error("Invalid week bounds");
    }
  }

  const span = dayStartsUtc[7] - dayStartsUtc[0];
  if (span < MIN_SPAN_MS || span > MAX_SPAN_MS) {
    throw new Error("Invalid week bounds");
  }
}

export function getLocalWeekDayIndex(
  dayStartsUtc: number[],
  timestampUtc: number
): number {
  for (let i = 0; i < 7; i++) {
    if (timestampUtc >= dayStartsUtc[i] && timestampUtc < dayStartsUtc[i + 1]) {
      return i;
    }
  }
  return -1;
}

function parseWeekDateUtc(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function assertLocalWeekDates(weekDates: string[]): void {
  if (weekDates.length !== 7) {
    throw new Error("Invalid week dates");
  }

  for (const date of weekDates) {
    if (!WEEK_DATE_PATTERN.test(date)) {
      throw new Error("Invalid week dates");
    }
  }

  for (let i = 0; i < weekDates.length - 1; i++) {
    if (weekDates[i] >= weekDates[i + 1]) {
      throw new Error("Invalid week dates");
    }
  }

  const span = parseWeekDateUtc(weekDates[6]) - parseWeekDateUtc(weekDates[0]);
  if (span !== SIX_DAYS_MS) {
    throw new Error("Invalid week dates");
  }
}
