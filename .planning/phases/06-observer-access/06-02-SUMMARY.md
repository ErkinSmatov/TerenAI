---
phase: 06-observer-access
plan: 02
subsystem: database
tags: [convex, mutations, queries, observer-access, bola]

# Dependency graph
requires:
  - phase: 06-observer-access (plan 01)
    provides: "observerLinks table + indexes, profiles.observerCode + byObserverCode index, convex/utils/observerAuth.ts (assertObserverAccess)"
provides:
  - "generateCode mutation — idempotent issuance of a patient's permanent 6-digit observer code"
  - "regenerateCode mutation — manual rotation that always issues a new code without touching observerLinks"
  - "issueUniqueCode(ctx, profileId) — shared uniqueness-checked code generator, named export of generateCode.ts"
  - "getMyObservers query — patient's connected-observer list with displayName + linkedAt"
  - "revokeLink mutation — symmetric link deletion with participant-membership check"
affects: [06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared generation logic lives as a named export (issueUniqueCode) alongside a file's own `export default` mutation, imported by a sibling file — precedent already set by convex/rateLimit.ts"
    - "displayName fallback chains built with Array.find + Boolean guard + `?? \"fallback\"` instead of chained `||`, to satisfy this project's eslint `prefer-nullish-coalescing` rule while preserving empty-string-is-not-a-value semantics"

key-files:
  created:
    - convex/observers/generateCode.ts
    - convex/observers/regenerateCode.ts
    - convex/observers/getMyObservers.ts
    - convex/observers/revokeLink.ts
  modified:
    - convex/_generated/api.d.ts

key-decisions:
  - "issueUniqueCode(ctx, profileId) exported by name from generateCode.ts and imported into regenerateCode.ts, exactly as instructed by the plan, avoiding duplicated uniqueness-loop logic across the two files"
  - "Uniqueness loop capped at 10 attempts (MAX_ATTEMPTS), throwing 'Не удалось сгенерировать код' on exhaustion instead of looping unbounded"
  - "getMyObservers resolves observer docs via Promise.all(links.map(...)) rather than a for-loop with array push, avoiding TS strict-mode implicit-any array typing and keeping the null-filter (missing observer -> skip) type-safe via a type predicate"

patterns-established:
  - "Cross-file helper reuse for near-duplicate mutations follows the rateLimiter.ts precedent: named export next to a default export, imported by the sibling file that needs the same logic"

requirements-completed: [OBSV-02, OBSV-07]

# Metrics
duration: 8min
completed: 2026-08-15
---

# Phase 6 Plan 02: Observer Access — Code, Roster, Revoke Summary

**Four Convex functions in `convex/observers/`: idempotent 6-digit code issuance/rotation via a shared uniqueness-checked helper, a patient-side observer roster with display-name fallback, and a symmetric link-revocation mutation gated by dual-role membership check**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-15T08:14:00Z (approx., immediately following plan 01)
- **Completed:** 2026-08-15T08:22:02Z
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 generated file regenerated)

## Accomplishments
- `convex/observers/generateCode.ts` — idempotent mutation resolving the caller's profile, returning the existing `observerCode` unchanged if present, otherwise generating one via the new `issueUniqueCode` helper
- `convex/observers/regenerateCode.ts` — always issues a fresh code through the same `issueUniqueCode` helper; verified to contain zero references to `ctx.db.delete` or `observerLinks`, so existing connections survive rotation
- `issueUniqueCode(ctx, profileId)` — shared uniqueness-checked generator (named export of `generateCode.ts`): loops `generateNumericToken(6)` against the `byObserverCode` index, capped at 10 attempts, throwing on exhaustion rather than looping forever
- `convex/observers/getMyObservers.ts` — query over `observerLinks.byPatientId`, resolving each observer doc, computing `displayName` via `name -> email -> phone -> "Гость"`, silently skipping links to deleted users, sorted by `linkedAt` (`_creationTime`) descending
- `convex/observers/revokeLink.ts` — single mutation serving both sides of a link; requires `link.observerId !== callerId && link.patientId !== callerId` to fail closed with `Forbidden`; missing link returns `null` early (idempotent double-revoke)
- All four functions deployed and visible in `convex/_generated/api.d.ts` as `api.observers.{generateCode,regenerateCode,getMyObservers,revokeLink}.default`

## Task Commits

Each task was committed atomically:

1. **Task 1: Выдача и ротация постоянного кода пациента** - `dae1a5f` (feat)
2. **Task 2: Список наблюдателей пациента с отображаемым именем** - `fe70d3e` (feat)
3. **Task 3: Симметричный разрыв связи с проверкой участия** - `e066c33` (feat)
4. **Generated api.d.ts refresh (side effect of `npx convex dev --once`)** - `368ec70` (chore)

**Plan metadata:** commit follows this SUMMARY.

## Files Created/Modified
- `convex/observers/generateCode.ts` - Idempotent code issuance mutation + exported `issueUniqueCode` helper
- `convex/observers/regenerateCode.ts` - Manual rotation mutation, imports `issueUniqueCode`
- `convex/observers/getMyObservers.ts` - Patient's observer roster query
- `convex/observers/revokeLink.ts` - Symmetric link-revocation mutation
- `convex/_generated/api.d.ts` - Convex codegen output, regenerated by `npx convex dev --once`

## Return Shapes (for plan 04's UI)

- `api.observers.generateCode.default()` → `Promise<string>` — the patient's 6-digit code (existing or newly issued)
- `api.observers.regenerateCode.default()` → `Promise<string>` — a freshly issued 6-digit code, always different from the previous one
- `api.observers.getMyObservers.default()` → `Promise<Array<{ linkId: Id<"observerLinks">; observerId: Id<"users">; displayName: string; linkedAt: number }>>`, sorted by `linkedAt` descending, deleted-observer links omitted
- `api.observers.revokeLink.default({ linkId: Id<"observerLinks"> })` → `Promise<null>` — throws `"Forbidden"` if caller is neither `observerId` nor `patientId` on the link; no-op (returns `null`) if the link no longer exists

## Decisions Made
- Named-export helper pattern (`issueUniqueCode`) chosen over duplicating the uniqueness loop in both files, matching the plan's explicit instruction and the existing `convex/rateLimit.ts` precedent for named exports alongside a domain module.
- `displayName` fallback implemented as `[name, email, phone].find(Boolean) ?? "Гость"` rather than a chained `||`, because the project's `@typescript-eslint/prefer-nullish-coalescing` ESLint rule flags `||` fallback chains — this form preserves the plan's "first non-empty value" semantics (empty string still skipped, not just `null`/`undefined`) while satisfying the linter.
- `getMyObservers` resolves observer docs with `Promise.all(links.map(...))` instead of a `for` loop with array `.push`, sidestepping TypeScript strict-mode's implicit-`any[]` inference on an empty-initialized array and keeping the null-filtering step type-safe via an explicit type predicate.

## Deviations from Plan

None - plan executed exactly as written. One incidental additional commit (`368ec70`) captures the Convex-generated `api.d.ts` diff produced by `npx convex dev --once` — standard generated-file churn, not a scope change. That diff also picked up module declarations for `TelegramOTP.ts`, `WhatsAppOTP.ts`, and `utils/otp.ts` because those untracked files (unrelated in-progress phone-auth feature) already existed in this working tree and Convex codegen scans the whole `convex/` directory regardless of git tracking state; this is noted in the commit message and does not touch any of those files' contents.

## Issues Encountered
- Initial `getMyObservers.ts` implementation used chained `||` for the `displayName` fallback, which the project's ESLint config (`@typescript-eslint/prefer-nullish-coalescing`) rejects. Fixed by rewriting as `Array.find(Boolean) ?? "Гость"` before the Task 2 commit — no functional change to the fallback priority, verified by re-running `npx eslint convex/observers/getMyObservers.ts` (clean) and `npx tsc --noEmit` (clean).
- Initial draft of `getMyObservers.ts` contained an explanatory code comment mentioning "assertObserverAccess" (to document why the gateway is intentionally absent), which caused the acceptance-criteria grep (`grep -c 'assertObserverAccess' convex/observers/getMyObservers.ts` expecting `0`) to fail with `1`. Reworded the comment to avoid the literal string before the Task 2 commit; re-verified grep returns `0`.

## User Setup Required

None - no external service configuration required. Functions deployed to the existing Convex dev deployment (`keen-meerkat-110`), same as plan 01.

## Next Phase Readiness
- All four functions are live on the dev deployment and typed in `convex/_generated/api.d.ts`, ready for plan 04's settings screen to call directly via the return shapes documented above.
- Nothing failed to verify — every task's `<acceptance_criteria>` and the plan-level `<verification>` block were re-run after fixes and pass cleanly (see Verification Evidence below).
- No blockers for plan 04 or plan 03.

## Verification Evidence

```
npx tsc --noEmit                                                    → clean (no output)
npx eslint convex/observers/                                        → clean (only baseline-browser-mapping info notice)
npx convex dev --once                                                → "Convex functions ready!" (deployed after Tasks 1-3, re-verified clean after)
grep -c 'generateNumericToken' convex/observers/generateCode.ts     → 2
grep -c 'byObserverCode' convex/observers/generateCode.ts           → 1
grep -c 'issueUniqueCode' convex/observers/regenerateCode.ts        → 2
grep -c 'byPatientId' convex/observers/getMyObservers.ts            → 1
grep -c 'Гость' convex/observers/getMyObservers.ts                  → 1
grep -rc 'assertObserverAccess' convex/observers/getMyObservers.ts  → 0
grep -c 'observerId !== callerId' convex/observers/revokeLink.ts    → 1
grep -c 'patientId !== callerId' convex/observers/revokeLink.ts     → 1
grep -c 'Forbidden' convex/observers/revokeLink.ts                  → 1
```

## Self-Check: PASSED

---
*Phase: 06-observer-access*
*Completed: 2026-08-15*
