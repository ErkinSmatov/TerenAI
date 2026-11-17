// Автомат статусов связи наблюдателя с пациентом.
//
// Модуль — единственный источник правил переходов: Convex-функции не реализуют
// переходы сами, а вызывают resolveTransition. Модуль чистый: без импортов из
// convex и без Date.now(), время приходит аргументом now.
//
// normalizeLinkStatus трактует отсутствие статуса как legacy-active только до
// миграции D-13 (план 11 переводит это на fail-closed).

/** D-09: пять хранимых статусов связи. */
export type LinkStatus = "pending" | "active" | "declined" | "revoked" | "expired";
export type LinkActor = "patient" | "observer" | "system";
export type LinkAction = "request" | "accept" | "decline" | "revoke" | "cancel" | "expire";

/** D-08: pending старше 14 суток считается истёкшим. */
export const PENDING_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;
/** D-10: после declined повторный запрос возможен не раньше чем через 24 часа. */
export const DECLINE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** Защита от спама push через цикл «отмена и повторный ввод кода». */
export const REQUEST_PUSH_DEDUP_MS = 24 * 60 * 60 * 1000;

export const REDEEM_ERRORS = {
  notFound: "CODE_NOT_FOUND",
  self: "CANNOT_OBSERVE_SELF",
  notAccepted: "REQUEST_NOT_ACCEPTED",
} as const;
export type RedeemErrorCode = (typeof REDEEM_ERRORS)[keyof typeof REDEEM_ERRORS];

export type LinkLike = {
  status?: LinkStatus;
  requestedAt?: number;
  respondedAt?: number;
  _creationTime: number;
};

export type TransitionResult =
  | { kind: "apply"; next: LinkStatus }
  | { kind: "noop" }
  | { kind: "forbidden" }
  | { kind: "cooldown" };

/** Строка без статуса (до миграции D-13) считается активной. */
export function normalizeLinkStatus(status: LinkStatus | undefined): LinkStatus {
  return status ?? "active";
}

/** LINK-01, D-05: pending не является активной связью. */
export function isActiveLink(link: { status?: LinkStatus }): boolean {
  return normalizeLinkStatus(link.status) === "active";
}

const FORBIDDEN: TransitionResult = { kind: "forbidden" };
const NOOP: TransitionResult = { kind: "noop" };

function apply(next: LinkStatus): TransitionResult {
  return { kind: "apply", next };
}

/**
 * Таблица переходов. current === null означает «строки пары нет».
 * Роль проверяется первой строкой ветки (LINK-02, D-07).
 */
export function resolveTransition(input: {
  current: LinkStatus | null;
  action: LinkAction;
  actor: LinkActor;
  now: number;
  respondedAt?: number;
}): TransitionResult {
  const { current, action, actor, now, respondedAt } = input;
  switch (action) {
    case "request": {
      if (actor !== "observer") return FORBIDDEN;
      if (current === null || current === "expired" || current === "revoked") {
        return apply("pending");
      }
      if (current === "declined") {
        // D-10: cooldown 24 часа после отклонения.
        if (respondedAt !== undefined && now - respondedAt < DECLINE_COOLDOWN_MS) {
          return { kind: "cooldown" };
        }
        return apply("pending");
      }
      return NOOP;
    }
    case "accept": {
      if (actor !== "patient") return FORBIDDEN;
      return current === "pending" ? apply("active") : NOOP;
    }
    case "decline": {
      if (actor !== "patient") return FORBIDDEN;
      return current === "pending" ? apply("declined") : NOOP;
    }
    case "revoke": {
      if (actor !== "patient" && actor !== "observer") return FORBIDDEN;
      return current === "active" ? apply("revoked") : NOOP;
    }
    case "cancel": {
      if (actor !== "observer") return FORBIDDEN;
      // Допущение A6: отмена запроса хранится как revoked с endedBy observer.
      return current === "pending" ? apply("revoked") : NOOP;
    }
    case "expire": {
      if (actor !== "system") return FORBIDDEN;
      return current === "pending" ? apply("expired") : NOOP;
    }
  }
}

const STATUS_RANK: Record<LinkStatus, number> = {
  active: 0,
  pending: 1,
  declined: 2,
  revoked: 3,
  expired: 4,
};

/** Выбирает «эффективную» связь пары: active > pending > declined > revoked > expired, затем более свежая. */
export function pickEffectiveLink<T extends LinkLike>(links: T[]): T | null {
  let best: T | null = null;
  for (const link of links) {
    if (best === null) {
      best = link;
      continue;
    }
    const rankDiff =
      STATUS_RANK[normalizeLinkStatus(link.status)] -
      STATUS_RANK[normalizeLinkStatus(best.status)];
    if (rankDiff < 0) {
      best = link;
    } else if (
      rankDiff === 0 &&
      (link.requestedAt ?? link._creationTime) > (best.requestedAt ?? best._creationTime)
    ) {
      best = link;
    }
  }
  return best;
}

/** D-08: pending истёк, когда прошло не меньше PENDING_EXPIRY_MS. */
export function isPendingExpired(requestedAt: number, now: number): boolean {
  return now - requestedAt >= PENDING_EXPIRY_MS;
}

/** Отправлять ли push о новом запросе (дедуп в пределах REQUEST_PUSH_DEDUP_MS). */
export function shouldNotifyRequest(lastNotifiedAt: number | undefined, now: number): boolean {
  if (lastNotifiedAt === undefined) return true;
  return now - lastNotifiedAt >= REQUEST_PUSH_DEDUP_MS;
}

/** D-11, LINK-05: клиника показывается только для verified и непустой строки. */
export function resolveDoctorBadge(
  doctor: { status: "pending" | "verified"; clinic: string } | null,
): { clinic: string } | null {
  if (!doctor) return null;
  if (doctor.status !== "verified") return null;
  const clinic = doctor.clinic.trim();
  if (clinic.length === 0) return null;
  return { clinic: doctor.clinic };
}
