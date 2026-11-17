// Заглушка (RED): реализация появится в следующем коммите.
export type LinkStatus = "pending" | "active" | "declined" | "revoked" | "expired";
export type LinkActor = "patient" | "observer" | "system";
export type LinkAction = "request" | "accept" | "decline" | "revoke" | "cancel" | "expire";

export const PENDING_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;
export const DECLINE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
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

const nie = (): never => {
  throw new Error("not implemented");
};

export function normalizeLinkStatus(_status: LinkStatus | undefined): LinkStatus {
  return nie();
}
export function isActiveLink(_link: { status?: LinkStatus }): boolean {
  return nie();
}
export function resolveTransition(_input: {
  current: LinkStatus | null;
  action: LinkAction;
  actor: LinkActor;
  now: number;
  respondedAt?: number;
}): TransitionResult {
  return nie();
}
export function pickEffectiveLink<T extends LinkLike>(_links: T[]): T | null {
  return nie();
}
export function isPendingExpired(_requestedAt: number, _now: number): boolean {
  return nie();
}
export function shouldNotifyRequest(_last: number | undefined, _now: number): boolean {
  return nie();
}
export function resolveDoctorBadge(
  _doctor: { status: "pending" | "verified"; clinic: string } | null,
): { clinic: string } | null {
  return nie();
}
