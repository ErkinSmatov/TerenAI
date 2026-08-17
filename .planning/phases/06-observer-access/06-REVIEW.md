---
phase: 06-observer-access
reviewed: 2026-08-17T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - app/app/(settings)/observedList.tsx
  - app/app/(settings)/observedPatient/[patientId].tsx
  - app/app/(settings)/observerCode.tsx
  - app/app/(tabs)/settings.tsx
  - components/home/HomeBloodPressureSummary.tsx
  - components/home/HomeGlucoseSummary.tsx
  - components/home/HomeHeader.tsx
  - components/home/HomeMacroSummary.tsx
  - components/home/HomeMicroSummary.tsx
  - components/home/HomeMovementSummary.tsx
  - components/home/HomeRecentlyLogged.tsx
  - components/observer/ObservedPatientCard.tsx
  - components/observer/ObserverListItem.tsx
  - convex/_generated/api.d.ts
  - convex/observers/generateCode.ts
  - convex/observers/getMyObservers.ts
  - convex/observers/getObservedPatients.ts
  - convex/observers/getPatientToday.ts
  - convex/observers/redeemCode.ts
  - convex/observers/regenerateCode.ts
  - convex/observers/revokeLink.ts
  - convex/observers/utils/thresholds.ts
  - convex/rateLimit.ts
  - convex/schema.ts
  - convex/tables/observerLinks.ts
  - convex/tables/profiles.ts
  - convex/users/deleteUser.ts
  - convex/utils/localDayBoundaries.ts
  - convex/utils/otp.ts
findings:
  critical: 2
  warning: 4
  info: 4
  total: 10
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-08-17
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

The core cross-user authorization gate (`assertObserverAccess`) is implemented correctly and is used exactly where it needs to be: `getPatientToday.ts` calls it before any patient-scoped read. `getObservedPatients.ts` and `getMyObservers.ts` correctly avoid it because they only ever query `observerLinks` scoped to the caller's own id first, which is a legitimate self-scoped access pattern, not an IDOR gap. `revokeLink.ts` implements its own (correct) bidirectional ownership check instead of reusing the gate, which is appropriate since either party may revoke. `deleteUser.ts` correctly tears down both directions of `observerLinks` so no link ever survives a deleted account.

However, two issues undermine the security model at the redemption/revocation boundary: (1) the 10/hour rate limit on code redemption is keyed only by the authenticated observer account, not by target code or globally, so it is trivially bypassed by creating multiple accounts against a 5-digit (100,000-value) secret; and (2) `redeemCode` has a check-then-insert race with no uniqueness constraint on `(observerId, patientId)`, so duplicate `observerLinks` rows can be created, and `revokeLink` only deletes a single row by id — a patient who "revokes" access while a duplicate link exists does not actually lose the observer's access, silently defeating the one explicit security control the patient has. Additional warnings cover a "today" boundary computed from the wrong party's device timezone, an inconsistent index usage, and a fragile targets fallback that could show a caregiver the wrong person's data under an edge case.

## Critical Issues

### CR-01: Observer code redemption rate limit is bypassable via multiple accounts, exposing a weak 5-digit secret to brute force

**File:** `convex/observers/redeemCode.ts:24-29`, `convex/observers/generateCode.ts:18`, `convex/rateLimit.ts:13-17`

**Issue:** The permanent access code is a 5-digit numeric string (`generateNumericToken(5)` → 100,000 possible values, see `generateCode.ts:18`). The only defense against guessing is `rateLimiter.limit(ctx, "observerCodeRedeem", { key: observerId, ... })`, a fixed window of 10 attempts/hour **keyed by the calling observer's own account** (`redeemCode.ts:24-29`, `rateLimit.ts:13-17`).

Because the rate limit key is the observer's own user id rather than the target code, the observer's IP, or a global bucket, an attacker only needs to automate creating additional accounts (the codebase's auth flow is not part of this phase, but nothing in the reviewed files gates account creation) to get a fresh 10-guesses/hour budget per account. With enough throwaway accounts, the entire 100,000-value code space — and therefore full read access to any patient's glucose, blood pressure, and meal data — can be enumerated in a practically feasible amount of time. This is the first cross-user-read surface in the codebase, so the redemption code is effectively a bearer credential for another person's health data; a 5-digit space combined with per-account (not per-target, not global) throttling is materially weaker than the authorization model implies.

**Fix:** Add a second rate-limit dimension that cannot be reset by creating a new account, e.g.:
```ts
// in redeemCode.ts, in addition to the existing per-observer limit:
await rateLimiter.limit(ctx, "observerCodeRedeemGlobal", {
  key: "global", // or per-IP if available
  throws: true,
});
```
Also consider: increasing code length/alphabet (5 digits is only ~16.6 bits of entropy), locking a specific code after N failed lookups within a short window, or requiring the *code itself* to have failed lookups tracked (e.g., a hashed-code counter) so brute forcing a specific target is throttled independent of how many observer accounts exist.

---

### CR-02: Duplicate `observerLinks` rows from a redeem race let an observer retain access after the patient revokes it

**File:** `convex/observers/redeemCode.ts:42-50`, `convex/tables/observerLinks.ts:9-12`, `convex/observers/revokeLink.ts:13-23`

**Issue:** `redeemCode` does a check-then-insert with no transaction-level uniqueness guarantee at the schema level:
```ts
const existingLink = await ctx.db.query("observerLinks")
  .withIndex("byObserverAndPatient", (q) => q.eq("observerId", observerId).eq("patientId", patientId))
  .first();
if (existingLink) return existingLink._id; // идемпотентно
return await ctx.db.insert("observerLinks", { observerId, patientId });
```
`observerLinks` (`convex/tables/observerLinks.ts:9-12`) has no unique index/constraint on `(observerId, patientId)` — Convex does not enforce uniqueness declaratively, and none is enforced in application code beyond this single read-then-write. Two concurrent redemptions of the same code by the same observer (double-tap, retry after a dropped response, multiple devices signed into the same account) can both observe `existingLink === null` and both insert, producing two rows for the same pair.

This directly breaks the patient's only mitigation: `revokeLink` (`revokeLink.ts:13-23`) deletes a single row by `linkId`. `ObserverListItem`/`getMyObservers` in the UI only expose one entry per apparent relationship (they don't dedupe), so the patient revokes what they see, but `assertObserverAccess` (`convex/utils/observerAuth.ts:23-28`) uses `.first()` and will still find the surviving duplicate — the observer keeps reading the patient's data despite the patient having explicitly revoked access. This is a silent authorization-bypass-after-revoke condition, which is a data exposure risk for a health-data feature.

**Fix:** Make the redeem path resilient to duplicates and make revoke authoritative:
```ts
// redeemCode.ts — collect() instead of first() to dedupe defensively, or
// better: delete extras opportunistically before returning.
// revokeLink.ts — delete ALL matching rows for the pair, not just one id:
const pairLinks = await ctx.db.query("observerLinks")
  .withIndex("byObserverAndPatient", (q) =>
    q.eq("observerId", link.observerId).eq("patientId", link.patientId))
  .collect();
for (const l of pairLinks) await ctx.db.delete(l._id);
```
Longer term, consider a single canonical link keyed by a deterministic id (e.g. derive the document from a compound key) so duplicates cannot exist by construction.

## Warnings

### WR-01: "Today" boundary for patient data is computed from the observer's device timezone, not the patient's

**File:** `convex/observers/getObservedPatients.ts:19,31-34`, `convex/observers/getPatientToday.ts:18,25-28`, `app/app/(settings)/observedList.tsx:25`, `app/app/(settings)/observedPatient/[patientId].tsx:64`

**Issue:** Both observer queries take `timezoneOffsetMinutes` as a client-supplied argument and use it to compute the patient's "local day" boundaries via `localDayBoundaries`. Every call site supplies `new Date().getTimezoneOffset()` from the **viewing device** — i.e., the observer's phone, not the patient's. If the observer is in a different timezone than the patient (a realistic scenario for a remote caregiver), "today" is calculated relative to the wrong location: the observer can see data classified as "today" that isn't yet/no-longer "today" for the patient, or miss data the patient logged that falls outside the observer's local-day window. This is a functional correctness bug in the core "today-only" access promise the feature is built around, and in the worst case (large offset difference) can extend the visible window beyond what "today-only" is meant to guarantee.

**Fix:** Since there's no patient-side timezone stored server-side, either (a) persist the patient's timezone (e.g., on `profiles`) and use that server-side for observer queries instead of trusting the caller's offset, or (b) explicitly document/accept this limitation and clamp the offset to a sane range, but the silent use of the *observer's* clock to gate access to *someone else's* "today" should at minimum be a deliberate, documented decision rather than an accidental byproduct of reusing the same client call pattern as the patient's own home screen.

### WR-02: `HomeMacroSummary` silently falls back to the logged-in user's own targets when the patient's targets are unavailable

**File:** `components/home/HomeMacroSummary.tsx:41-43`, `app/app/(settings)/observedPatient/[patientId].tsx:106`, `convex/observers/getPatientToday.ts:91`

**Issue:** In the observer's patient-detail screen, `targets={data.targets ?? undefined}` is passed down, where `data.targets` comes from `patientProfile?.targets ?? null` (`getPatientToday.ts:91`). Inside `HomeMacroSummary`, the fallback chain is:
```ts
const profileTargets = useQuery(api.profiles.getProfile.default)?.targets; // the CALLER's own profile
const targets = targetsProp ?? profileTargets ?? profilesConfig.defaultValues.targets;
```
If `targetsProp` is ever `undefined` (i.e., the patient has no profile row at query time), the component falls back to `profileTargets`, which is the **observer's own** macro targets — displayed as if they belonged to the patient being viewed, with no `readOnly`-aware guard against this substitution. In the currently reachable flows this is hard to trigger (a patient must have a `profiles` row before `generateCode` will even issue a share code), but the component has no defense-in-depth against it, and any future change to the redeem/onboarding order would silently show a caregiver the wrong person's nutrition targets — a meaningful problem in a health-monitoring feature.

**Fix:** Make the read-only path fail safe instead of silently substituting the viewer's own data:
```ts
const targets = readOnly
  ? (targetsProp ?? profilesConfig.defaultValues.targets)
  : (targetsProp ?? profileTargets ?? profilesConfig.defaultValues.targets);
```
and/or skip the `getProfile` query entirely when rendering in `readOnly`/observer context.

### WR-03: `generateCode`/`regenerateCode` bypass the existing `byUserId` index on `profiles`

**File:** `convex/observers/generateCode.ts:41-44`, `convex/observers/regenerateCode.ts:13-16`

**Issue:** Both mutations look up the caller's profile with:
```ts
const profile = await ctx.db.query("profiles").filter((q) => q.eq(q.field("userId"), userId)).first();
```
`profiles` has an indexed `byUserId` (`convex/tables/profiles.ts:75`), and every other observer file in this same phase (`getPatientToday.ts:76-79`, `getObservedPatients.ts:60-63`) correctly uses `withIndex("byUserId", ...)`. Using `.filter()` here scans the whole `profiles` collection instead of doing an indexed point lookup — inconsistent with the pattern established elsewhere in the same PR and needlessly non-scalable as the user base grows.

**Fix:**
```ts
const profile = await ctx.db
  .query("profiles")
  .withIndex("byUserId", (q) => q.eq("userId", userId))
  .first();
```

### WR-04: Expected validation failures are logged as errors on every observer mutation

**File:** `convex/observers/generateCode.ts:37,50-53`, `convex/observers/redeemCode.ts:15,51-54`, `convex/observers/regenerateCode.ts:9,23-26`, `convex/observers/revokeLink.ts:9,25-28`

**Issue:** Every observer mutation wraps its handler in `try { ... } catch (error) { logError(...); throw error; }`. This means routine, expected user-input failures — a mistyped code (`"Code not found"`), a rate-limit hit, attempting to revoke a link you don't own (`"Forbidden"`) — are logged identically to genuine unexpected failures. At the volume this endpoint could see (including from CR-01's brute-force scenario), this makes the error log an unreliable signal: real bugs get buried in routine "user typed the wrong code" noise, and it becomes harder to build alerting on the redeem path specifically for abuse detection.

**Fix:** Distinguish expected control-flow exceptions (e.g., a small set of typed error classes) from unexpected ones, and only route the latter through `logError`, or attach a severity/tag so these can be filtered in monitoring.

## Info

### IN-01: `resolveDisplayName` logic duplicated across three files

**File:** `convex/observers/getObservedPatients.ts:9-15`, `convex/observers/getPatientToday.ts:7-13`, `convex/observers/getMyObservers.ts:25-28`

**Issue:** The same "pick name, then email, then phone, else 'Гость'" logic is implemented three times with slightly different shapes (two as a named function, one inlined with `.find()`). A future change to the fallback priority or the "Гость" copy is likely to be applied inconsistently.

**Fix:** Extract a single `resolveDisplayName` helper into `convex/utils/` and import it in all three places.

### IN-02: Unstable React key in `HomeRecentlyLogged`

**File:** `components/home/HomeRecentlyLogged.tsx:110`

**Issue:** `key={`log-item-${index}-${meal.name}`}` uses list index plus a non-unique display name instead of the stable `meal._id`, which is already available on the object. Two meals with the same name, or a reorder from a live Convex subscription update, can cause React to misassociate component state (e.g., skeleton/loading state) across rows.

**Fix:** `key={meal._id}`.

### IN-03: `revokeLink` behaves differently for "not found" vs "forbidden"

**File:** `convex/observers/revokeLink.ts:13-21`

**Issue:** A non-existent `linkId` returns `null` silently, while an existing link the caller isn't part of throws `"Forbidden"`. This gives a caller a (low-value, given Convex id entropy) oracle to distinguish "this id doesn't exist" from "this id exists but isn't yours." Not exploitable in practice given id unguessability, but worth normalizing for consistency.

**Fix:** Consider returning the same outcome (e.g., silently no-op) for both cases if the distinction isn't needed by callers.

### IN-04: "Cannot observe yourself" is a distinguishable error from "Code not found"

**File:** `convex/observers/redeemCode.ts:38-40`

**Issue:** The comment above the format check explicitly notes the intent to keep "invalid format" and "code not found" indistinguishable, but a separate, distinct `"Cannot observe yourself"` error is thrown right after a successful code lookup. This leaks a one-bit signal ("the code you entered belongs to your own account") that's low-impact (you already know your own code) but is an inconsistency with the stated design intent one line above.

**Fix:** No action likely needed given low impact; noting for awareness given the adjacent comment's stated threat model.

---

## Resolution (orchestrator, 2026-08-17)

| Finding | Outcome | Notes |
|---------|---------|-------|
| CR-01 | fixed | Added `observerCodeGuess` limiter keyed by the code itself (`convex/rateLimit.ts`, `redeemCode.ts`) alongside the existing per-observer limit — closes the multi-account bypass without a shared global bucket that could DoS legitimate use. |
| CR-02 | fixed | `revokeLink.ts` now deletes all rows matching `(observerId, patientId)`, not just the given `linkId` — revoke is authoritative regardless of how a duplicate link arose. |
| WR-01 | accepted (pre-existing) | Not a new gap — this tradeoff (observer's device timezone used for patient's "today") was already explicitly accepted in the phase threat model (T-06-19) and documented in `06-03-SUMMARY.md`. No action taken here. |
| WR-02 | fixed | `HomeMacroSummary` gained a `readOnly` prop; in read-only mode the own-profile query is skipped (`"skip"`) entirely rather than merely unused, so it cannot fall back to the viewer's own targets. Wired at the one call site that was missing it (`observedPatient/[patientId].tsx`). |
| WR-03 | fixed | `generateCode.ts`/`regenerateCode.ts` switched from `.filter()` to the existing `byUserId` index, matching the rest of the phase. |
| WR-04 | deferred | Logging expected validation errors as `error` is a project-wide pattern (every Convex mutation uses the same `try/catch` + `logError` shape), not specific to this phase. Changing it here alone would be inconsistent; out of scope for a single-phase fix. |
| IN-01..IN-04 | deferred | Non-blocking; left as documented findings for future cleanup. |

`npx tsc --noEmit`, `npx eslint`, and `npx convex dev --once` clean after all fixes.

---

_Reviewed: 2026-08-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
