// Чистый модуль без зависимостей от convex/react/react-native — общие правила
// push-уведомлений из листа «Правила» docs/TEREN_Push_Notifications.xlsx.
// Импортируется Convex-cron (план 74-06) и ts-node verify-скриптами.
//
// Соглашение о часовом поясе то же, что в reminderSchedule.ts:
// `timezoneOffsetMinutes` — результат `Date.getTimezoneOffset()`,
// `localMs = utcMs - timezoneOffsetMinutes * 60_000`.

import {
  DAY_MS,
  MEAL_REMINDER_WINDOW_MINUTES,
  getLocalParts,
  isWeighInDue,
} from "@/lib/notifications/reminderSchedule";

// Классы push (лист «Правила»): B — напоминания по расписанию,
// C — подсказки ИИ, D — поддержка, A и E — критичные/платёжные.
export type PushClass = "A" | "B" | "C" | "D" | "E";

// Правило 2: классы C и D вместе — не более 3 push в локальные сутки.
export const LIMITED_PUSH_CLASSES: PushClass[] = ["C", "D"];
export const LIMITED_PUSH_DAILY_MAX = 3;

// FOOD-01: не более 2 push в сутки.
export const FOOD_REMINDER_DAILY_MAX = 2;

// Правило 3: тихие часы 22:00–08:00 по локальному времени. Фиксированы
// (выбор времени пользователем вне объёма).
export const QUIET_HOURS_START_MINUTES = 22 * 60;
export const QUIET_HOURS_END_MINUTES = 8 * 60;

export function isQuietHours(
  nowUtcMs: number,
  timezoneOffsetMinutes: number
): boolean {
  const { minutesSinceLocalMidnight } = getLocalParts(
    nowUtcMs,
    timezoneOffsetMinutes
  );
  return (
    minutesSinceLocalMidnight >= QUIET_HOURS_START_MINUTES ||
    minutesSinceLocalMidnight < QUIET_HOURS_END_MINUTES
  );
}

// Суточный счётчик: сбрасывается при смене локальных суток.
export type DailyCounter = { dayStartUtcMs: number; count: number };

export function canSendWithDailyLimit(
  counter: DailyCounter | undefined,
  localDayStartUtcMs: number,
  max: number
): boolean {
  if (!counter || counter.dayStartUtcMs !== localDayStartUtcMs) {
    return true;
  }
  return counter.count < max;
}

export function incrementDailyCounter(
  counter: DailyCounter | undefined,
  localDayStartUtcMs: number
): DailyCounter {
  if (!counter || counter.dayStartUtcMs !== localDayStartUtcMs) {
    return { dayStartUtcMs: localDayStartUtcMs, count: 1 };
  }
  return { dayStartUtcMs: localDayStartUtcMs, count: counter.count + 1 };
}

// Правило 11: ротация вариантов по кругу без повтора подряд.
export function pickRotatedTextIndex(
  allowedIndexes: number[],
  lastIndex: number | undefined
): number {
  const first = allowedIndexes[0];
  if (lastIndex === undefined) {
    return first;
  }
  let next = allowedIndexes.find((index) => index > lastIndex);
  if (next === undefined) {
    next = first;
  }
  if (next === lastIndex && allowedIndexes.length > 1) {
    const position = allowedIndexes.indexOf(next);
    next = allowedIndexes[(position + 1) % allowedIndexes.length];
  }
  return next;
}

// Попадание в получасовое окно локального часа (интервал cron-тика).
export function isInLocalSlot(
  nowUtcMs: number,
  timezoneOffsetMinutes: number,
  hour: number
): boolean {
  const { minutesSinceLocalMidnight } = getLocalParts(
    nowUtcMs,
    timezoneOffsetMinutes
  );
  const start = hour * 60;
  return (
    minutesSinceLocalMidnight >= start &&
    minutesSinceLocalMidnight < start + MEAL_REMINDER_WINDOW_MINUTES
  );
}

export function isLocalSunday(
  nowUtcMs: number,
  timezoneOffsetMinutes: number
): boolean {
  return (
    new Date(nowUtcMs - timezoneOffsetMinutes * 60_000).getUTCDay() ===
    WEEKLY_WEIGH_IN_WEEKDAY
  );
}

// HLT-14: по умолчанию воскресенье; время 10:00 сохраняется из isWeighInDue.
export const WEEKLY_WEIGH_IN_WEEKDAY = 0;

export function isWeeklyWeighInDue(input: {
  nowUtcMs: number;
  timezoneOffsetMinutes: number;
  weightUpdatedAtMs: number;
  lastReminderSentAtMs?: number;
}): boolean {
  return (
    isLocalSunday(input.nowUtcMs, input.timezoneOffsetMinutes) &&
    isWeighInDue(input)
  );
}

// RET-01..03: возврат неактивных пользователей.
export const RETENTION_SLOT_HOUR = 12;
export const RETENTION_STAGE_DAYS = { 1: 3, 2: 7, 3: 14 } as const;
export type RetentionStage = 1 | 2 | 3;

export function resolveRetentionStage(input: {
  nowUtcMs: number;
  lastActiveAtMs: number;
  lastSentStage?: number;
  lastSentAtMs?: number;
}): RetentionStage | null {
  const inactiveMs = input.nowUtcMs - input.lastActiveAtMs;

  let dueStage: RetentionStage | null = null;
  for (const stage of [1, 2, 3] as const) {
    if (inactiveMs >= RETENTION_STAGE_DAYS[stage] * DAY_MS) {
      dueStage = stage;
    }
  }
  if (dueStage === null) {
    return null;
  }

  // Если пользователь возвращался после последней отправки — цепочка с нуля.
  const prevStage =
    input.lastSentAtMs !== undefined &&
    input.lastSentAtMs > input.lastActiveAtMs
      ? (input.lastSentStage ?? 0)
      : 0;

  return dueStage > prevStage ? dueStage : null;
}

// RET-03 — последнее push-сообщение, дальше только критичные и платёжные.
export const DORMANT_AFTER_MS = 14 * DAY_MS;

export function isDormant(nowUtcMs: number, lastActiveAtMs: number): boolean {
  return nowUtcMs - lastActiveAtMs >= DORMANT_AFTER_MS;
}

// Правила 9 и 10: заголовок ≤40, текст ≤140 (в кодпоинтах), ровно одно эмодзи
// в конце текста, в заголовке эмодзи нет.
export const TITLE_MAX = 40;
export const BODY_MAX = 140;

export function validatePushCopy(
  title: string,
  body: string
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (Array.from(title).length > TITLE_MAX) {
    errors.push(`заголовок длиннее ${TITLE_MAX} символов`);
  }
  if (Array.from(body).length > BODY_MAX) {
    errors.push(`текст длиннее ${BODY_MAX} символов`);
  }
  if (/\p{Extended_Pictographic}/u.test(title)) {
    errors.push("в заголовке не должно быть эмодзи");
  }

  const emojiCount = (body.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  if (emojiCount !== 1) {
    errors.push(`в тексте должно быть ровно одно эмодзи, найдено ${emojiCount}`);
  } else if (!/\p{Extended_Pictographic}️?$/u.test(body)) {
    errors.push("эмодзи должно стоять в конце текста");
  }

  return { ok: errors.length === 0, errors };
}
