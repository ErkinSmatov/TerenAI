import assert from "node:assert/strict";
import {
  DECLINE_COOLDOWN_MS,
  PENDING_EXPIRY_MS,
  REDEEM_ERRORS,
  REQUEST_PUSH_DEDUP_MS,
  isActiveLink,
  isPendingExpired,
  normalizeLinkStatus,
  pickEffectiveLink,
  resolveDoctorBadge,
  resolveTransition,
  shouldNotifyRequest,
  type LinkAction,
  type LinkActor,
  type LinkStatus,
  type TransitionResult,
} from "@/lib/observers/linkStatus";

const NOW = Date.UTC(2026, 10, 13, 12, 0, 0);

// --- Константы сроков (D-08, D-10) ---
assert.equal(PENDING_EXPIRY_MS, 14 * 24 * 60 * 60 * 1000);
assert.equal(DECLINE_COOLDOWN_MS, 24 * 60 * 60 * 1000);
assert.equal(REQUEST_PUSH_DEDUP_MS, 24 * 60 * 60 * 1000);
assert.deepEqual(REDEEM_ERRORS, {
  notFound: "CODE_NOT_FOUND",
  self: "CANNOT_OBSERVE_SELF",
  notAccepted: "REQUEST_NOT_ACCEPTED",
});

const apply = (next: LinkStatus): TransitionResult => ({ kind: "apply", next });
const noop: TransitionResult = { kind: "noop" };
const forbidden: TransitionResult = { kind: "forbidden" };
const cooldown: TransitionResult = { kind: "cooldown" };

const t = (
  current: LinkStatus | null,
  action: LinkAction,
  actor: LinkActor,
  respondedAt?: number,
) => resolveTransition({ current, action, actor, now: NOW, respondedAt });

// --- request (observer) ---
assert.deepStrictEqual(t(null, "request", "observer"), apply("pending"));
assert.deepStrictEqual(t("expired", "request", "observer"), apply("pending"));
assert.deepStrictEqual(t("revoked", "request", "observer"), apply("pending"));
assert.deepStrictEqual(t("pending", "request", "observer"), noop);
assert.deepStrictEqual(t("active", "request", "observer"), noop);
// D-10: cooldown после declined
assert.deepStrictEqual(t("declined", "request", "observer", NOW - 1000), cooldown);
assert.deepStrictEqual(
  t("declined", "request", "observer", NOW - DECLINE_COOLDOWN_MS + 1),
  cooldown,
);
assert.deepStrictEqual(
  t("declined", "request", "observer", NOW - DECLINE_COOLDOWN_MS),
  apply("pending"),
);
assert.deepStrictEqual(t("declined", "request", "observer"), apply("pending"));
assert.deepStrictEqual(t(null, "request", "patient"), forbidden);
assert.deepStrictEqual(t(null, "request", "system"), forbidden);

// --- accept (patient) ---
assert.deepStrictEqual(t("pending", "accept", "patient"), apply("active"));
for (const s of ["active", "declined", "revoked", "expired"] as const) {
  assert.deepStrictEqual(t(s, "accept", "patient"), noop);
}
assert.deepStrictEqual(t(null, "accept", "patient"), noop);
assert.deepStrictEqual(t("pending", "accept", "observer"), forbidden);
assert.deepStrictEqual(t("pending", "accept", "system"), forbidden);

// --- decline (patient) ---
assert.deepStrictEqual(t("pending", "decline", "patient"), apply("declined"));
assert.deepStrictEqual(t("active", "decline", "patient"), noop);
assert.deepStrictEqual(t("pending", "decline", "observer"), forbidden);
assert.deepStrictEqual(t("pending", "decline", "system"), forbidden);

// --- revoke (patient | observer) ---
assert.deepStrictEqual(t("active", "revoke", "patient"), apply("revoked"));
assert.deepStrictEqual(t("active", "revoke", "observer"), apply("revoked"));
assert.deepStrictEqual(t("pending", "revoke", "patient"), noop);
assert.deepStrictEqual(t("declined", "revoke", "observer"), noop);
assert.deepStrictEqual(t("active", "revoke", "system"), forbidden);

// --- cancel (observer), допущение A6 ---
assert.deepStrictEqual(t("pending", "cancel", "observer"), apply("revoked"));
assert.deepStrictEqual(t("active", "cancel", "observer"), noop);
assert.deepStrictEqual(t("pending", "cancel", "patient"), forbidden);
assert.deepStrictEqual(t("pending", "cancel", "system"), forbidden);

// --- expire (system) ---
assert.deepStrictEqual(t("pending", "expire", "system"), apply("expired"));
assert.deepStrictEqual(t("active", "expire", "system"), noop);
assert.deepStrictEqual(t("pending", "expire", "patient"), forbidden);
assert.deepStrictEqual(t("pending", "expire", "observer"), forbidden);

// --- Полная таблица: 6 action x 3 actor (T-78-01) ---
const allowedActor: Record<LinkAction, LinkActor[]> = {
  request: ["observer"],
  accept: ["patient"],
  decline: ["patient"],
  revoke: ["patient", "observer"],
  cancel: ["observer"],
  expire: ["system"],
};
const actions = Object.keys(allowedActor) as LinkAction[];
const actors: LinkActor[] = ["patient", "observer", "system"];
for (const action of actions) {
  for (const actor of actors) {
    const result = t("pending", action, actor);
    if (allowedActor[action].includes(actor)) {
      assert.notEqual(result.kind, "forbidden", `${action}/${actor}`);
    } else {
      assert.deepStrictEqual(result, forbidden, `${action}/${actor}`);
    }
  }
}

// --- normalizeLinkStatus / isActiveLink ---
assert.equal(normalizeLinkStatus(undefined), "expired");
assert.equal(normalizeLinkStatus("pending"), "pending");
assert.equal(isActiveLink({ status: "active" }), true);
assert.equal(isActiveLink({}), false);
for (const s of ["pending", "declined", "revoked", "expired"] as const) {
  assert.equal(isActiveLink({ status: s }), false, s);
}

// --- pickEffectiveLink ---
assert.equal(pickEffectiveLink([]), null);
const revoked = { status: "revoked" as const, _creationTime: 5 };
const active = { status: "active" as const, _creationTime: 1 };
assert.equal(pickEffectiveLink([revoked, active]), active);
const declined = { status: "declined" as const, respondedAt: 9, _creationTime: 2 };
const pending = { status: "pending" as const, requestedAt: 3, _creationTime: 3 };
assert.equal(pickEffectiveLink([declined, pending]), pending);
const expired = { status: "expired" as const, _creationTime: 1 };
assert.equal(pickEffectiveLink([expired, revoked]), revoked);
assert.equal(pickEffectiveLink([declined, revoked]), declined);
// Одинаковый статус: выигрывает более поздняя строка
const p1 = { status: "pending" as const, requestedAt: 10, _creationTime: 1 };
const p2 = { status: "pending" as const, requestedAt: 20, _creationTime: 1 };
assert.equal(pickEffectiveLink([p1, p2]), p2);
const r1 = { status: "revoked" as const, _creationTime: 7 };
const r2 = { status: "revoked" as const, _creationTime: 4 };
assert.equal(pickEffectiveLink([r2, r1]), r1);
// Строка без статуса (fail-closed) считается expired и уступает pending
const legacy = { _creationTime: 1 };
assert.equal(pickEffectiveLink([pending, legacy]), pending);

// --- isPendingExpired (D-08) ---
assert.equal(isPendingExpired(NOW - PENDING_EXPIRY_MS, NOW), true);
assert.equal(isPendingExpired(NOW - PENDING_EXPIRY_MS + 1, NOW), false);
assert.equal(isPendingExpired(NOW, NOW), false);

// --- shouldNotifyRequest ---
assert.equal(shouldNotifyRequest(undefined, NOW), true);
assert.equal(shouldNotifyRequest(NOW - REQUEST_PUSH_DEDUP_MS + 1, NOW), false);
assert.equal(shouldNotifyRequest(NOW - REQUEST_PUSH_DEDUP_MS, NOW), true);

// --- resolveDoctorBadge (D-11, LINK-05) ---
assert.equal(resolveDoctorBadge(null), null);
assert.equal(resolveDoctorBadge({ status: "pending", clinic: "X" }), null);
assert.deepStrictEqual(resolveDoctorBadge({ status: "verified", clinic: "Клиника" }), {
  clinic: "Клиника",
});
assert.equal(resolveDoctorBadge({ status: "verified", clinic: "" }), null);
assert.equal(resolveDoctorBadge({ status: "verified", clinic: "   " }), null);

console.log("verifyLinkStatus: OK");
