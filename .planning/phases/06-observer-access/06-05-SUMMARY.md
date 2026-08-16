---
phase: 06-observer-access
plan: 05
subsystem: ui
tags: [expo-router, react-native, convex, observer-access, read-only-ui]

# Dependency graph
requires:
  - phase: 06-observer-access
    provides: "api.observers.getPatientToday.default — patient-scoped today query gated by assertObserverAccess (plan 03)"
provides:
  - "readOnly?: boolean prop on HomeGlucoseSummary, HomeBloodPressureSummary, HomeMovementSummary, HomeRecentlyLogged, HomeMicroSummary — strips Link/Button wrappers into owner-scoped mutation/full-history routes"
  - "targets?: {calories,carbs,protein,fat} prop on HomeMacroSummary — lets a caller override the profile-derived targets without touching the unconditional useQuery call"
  - "app/app/(settings)/observedPatient/[patientId].tsx — typed detail route observers navigate to (plan 06 links into it)"
affects: [06-06, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Card-content-as-variable + conditional Link wrap: each read-only-capable Home component builds its card JSX once into a local const, then either returns it bare (readOnly) or wraps it in the existing Link/Button (default) — avoids duplicating markup across two branches"
    - "expo-router route-level `export function ErrorBoundary({ retry }: ErrorBoundaryProps)` convention used to catch a useQuery render-time throw (Convex queries throw synchronously when the server function throws) without a hand-rolled class component"
    - "Hook-order-safe optional prop override: `const profileTargets = useQuery(...)?.targets; const targets = targetsProp ?? profileTargets ?? fallback;` — the hook call itself stays unconditional; only the resulting value participates in the priority chain"

key-files:
  created:
    - "app/app/(settings)/observedPatient/[patientId].tsx"
  modified:
    - components/home/HomeGlucoseSummary.tsx
    - components/home/HomeBloodPressureSummary.tsx
    - components/home/HomeMovementSummary.tsx
    - components/home/HomeRecentlyLogged.tsx
    - components/home/HomeMicroSummary.tsx
    - components/home/HomeMacroSummary.tsx

key-decisions:
  - "Access-revoked state uses expo-router's route-level ErrorBoundary export (not a manual class component or a try/catch around useQuery) — Convex's useQuery throws synchronously during render when the server query throws (documented behavior: '@throws An error if the query encountered an error on the server'), and expo-router's per-route `ErrorBoundary` export is the idiomatic way to catch that without introducing a new shared error-boundary abstraction. Confirmed present in node_modules/expo-router/build/views/{Try,ErrorBoundary}.d.ts (ErrorBoundaryProps: { error, retry })"
  - "useLocalSearchParams typed directly as `{ patientId: Id<'users'> }>()`, matching the exact convention already used by every other dynamic route in the codebase (mealId, mealItemId in app/app/(meal)/*.tsx, app/app/(mealItem)/*.tsx) — no manual `as Id<...>` cast needed since expo-router's typed-params generic accepts it"
  - "HomeMacroSummary's targets priority chain evaluates the useQuery result into a plain variable first (`profileTargets`), then combines via `targetsProp ?? profileTargets ?? fallback` — an earlier draft short-circuited useQuery itself behind `targetsProp ??`, which would have made the hook call conditional (violates Rules of Hooks and the plan's explicit instruction); caught and fixed before verification"
  - "dayIndex on the detail screen is computed with the exact same formula as the main screen ((getDay(new Date()) + 6) % 7), not derived from any query field, since HomeMicroSummary only uses it to build a route param that is never followed in readOnly mode"

patterns-established:
  - "Read-only variant via optional prop, not a separate component: every Home component that gained readOnly kept its existing default-false behavior and default call sites (app/app/(tabs)/index.tsx) byte-for-byte unchanged — future screens needing a read-only Home block should extend this same prop rather than forking a new component"

requirements-completed: [OBSV-06]

# Metrics
duration: ~45min (interrupted once by a session-limit API error between Task 2 and Task 3; resumed from committed state with no rework)
completed: 2026-08-16
---

# Phase 6 Plan 05: Observer Detail View Summary

**Six Home-screen summary components gained a read-only mode (dropped mutation/history entry points) and a targets-override prop, composed into a new `/app/(settings)/observedPatient/[patientId]` route that shows one patient's today through a single `getPatientToday` query with zero mutations and zero owner-scoped reads**

## Performance

- **Duration:** ~45 min (across two work sessions due to an infrastructure interruption; no work was lost or redone)
- **Started:** 2026-08-15T13:28:00Z (approx.)
- **Completed:** 2026-08-16T (approx.)
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- `HomeGlucoseSummary`, `HomeBloodPressureSummary`, `HomeMovementSummary` gained `readOnly?: boolean` (default `false`): under `readOnly`, the header's "Все" button disappears and the card renders unwrapped (no `Link`, no `Button`) instead of being tappable into `glucoseLog`/`bloodPressureLog`/`movementLog`. `HomeMovementSummary` additionally drops its empty-state fallback link to `/app/(settings)/health` under `readOnly`, since that link targets the *observer's* own Apple Health settings.
- `HomeRecentlyLogged` and `HomeMicroSummary` gained the same `readOnly` prop, dropping their `Link` into `/app/(meal)/meal` and `/app/(home)/nutrients` respectively — both of those targets are owner-scoped screens that would reject an observer's read.
- `HomeMacroSummary` gained an optional `targets` prop with priority `targetsProp ?? profileTargets ?? profilesConfig.defaultValues.targets`; the underlying `useQuery(api.profiles.getProfile.default)` call remains unconditional (assigned to a plain variable first) so Rules of Hooks is never at risk, while a passed-in `targets` value now wins over it.
- New route `app/app/(settings)/observedPatient/[patientId].tsx`: single `useQuery(api.observers.getPatientToday.default, { patientId, timezoneOffsetMinutes })` call feeds all six summary components in the same order as the main screen, all six in read-only mode (`HomeMacroSummary` has no `readOnly` prop to pass — it has no interactive entry points to strip). Loading state renders `ScreenMainTitle` in its skeleton form rather than feeding empty arrays into the summaries. Access-revocation mid-session is caught via expo-router's route-level `ErrorBoundary` export, which shows an explanation + retry instead of a crash.

## Task Commits

Each task was committed atomically:

1. **Task 1: Read-only режим у сводок глюкозы, давления и активности** - `68dac27` (feat)
2. **Task 2: Read-only список блюд, read-only микронутриенты, подстановка чужих целей в сводку БЖУ** - `8858969` (feat)
3. **Task 3: Экран детального вида наблюдаемого пациента** - `683438e` (feat)

## Files Created/Modified
- `components/home/HomeGlucoseSummary.tsx` - `readOnly` prop strips header button + card Link wrapper
- `components/home/HomeBloodPressureSummary.tsx` - same pattern as glucose summary
- `components/home/HomeMovementSummary.tsx` - same pattern, plus drops the `/app/(settings)/health` empty-state link under `readOnly`
- `components/home/HomeRecentlyLogged.tsx` - `readOnly` prop propagated to `LogItem`, strips the `/app/(meal)/meal` Link
- `components/home/HomeMicroSummary.tsx` - `readOnly` prop strips the `/app/(home)/nutrients` Link around the big score card
- `components/home/HomeMacroSummary.tsx` - optional `targets` prop, three-tier priority (prop → own profile query → config fallback), `useQuery` call kept unconditional
- `app/app/(settings)/observedPatient/[patientId].tsx` - new route: patient detail view, single query, six read-only summary blocks, loading/error states

## Decisions Made
- Access-revoked handling uses expo-router's route-level `ErrorBoundary` export convention rather than a hand-rolled class component or try/catch — this is the framework-native mechanism for catching a render-time throw from `useQuery`, confirmed by reading `node_modules/expo-router/build/views/{Try,ErrorBoundary}.d.ts` (`ErrorBoundaryProps: { error, retry }`) since no prior example of this pattern existed anywhere in the codebase to copy from.
- `useLocalSearchParams<{ patientId: Id<"users"> }>()` typed directly against `Id<"users">`, matching the exact convention already established by `mealId`/`mealItemId` typed params elsewhere in `app/app/(meal)/` and `app/app/(mealItem)/` — no manual cast added.
- `HomeMacroSummary`'s `useQuery` result is captured into an intermediate `profileTargets` variable before entering the `??` priority chain — an earlier draft nested the `useQuery(...)` call itself inside the `??` chain (`targetsProp ?? useQuery(...) ?? fallback`), which JavaScript short-circuit evaluation would have made conditional (the hook would not run at all when `targetsProp` is set). Caught and corrected before running verification, since the plan explicitly required the call to stay unconditional.

## Deviations from Plan

None — plan executed exactly as written. One incidental note, not a scope deviation:

- This worktree had no `node_modules` directory of its own (gitignored, absent from a fresh worktree checkout as in prior plans' summaries). Unlike plan 06-03's worktree, no symlink was needed here — Node's module resolution walked up to the main checkout's `node_modules` at `/Users/smatov/GitLab/CalYo/node_modules` automatically, so `npx tsc`/`npx eslint` resolved correctly without any setup step.

## Issues Encountered

- **Pre-existing, out-of-scope `tsc` error found at the base commit, before any edits in this plan:** `convex/observers/generateCode.ts(4,34): error TS2307: Cannot find module '../utils/otp'`. Verified via `git stash` + `npx tsc --noEmit` that this error is present at the exact base commit (`8246c11`) this plan started from, i.e. it predates every change in this plan and originates from plan 06-02's `generateCode.ts`, which imports a `convex/utils/otp.ts` module that was never committed anywhere in this branch's history (`git log --all --oneline -- convex/utils/otp.ts` returns nothing). None of this plan's three tasks touch `convex/` at all (files_modified was entirely `components/home/*` and one new `app/app/(settings)/observedPatient/*` route), so per the scope-boundary deviation rule this was left unfixed and is reported here rather than silently patched. `npx tsc --noEmit` was re-run after every task and produced this single identical line each time — no new errors were introduced by this plan's changes. This will block a clean `npx tsc --noEmit` for the phase as a whole until plan 06-02's `generateCode.ts`/`regenerateCode.ts` files (or a shared `convex/utils/otp.ts`) are reconciled — worth flagging to whichever plan/session owns that file next.
- One session-limit API interruption occurred between Task 2 and Task 3. No rework was needed: Tasks 1 and 2 were already committed (`68dac27`, `8858969`) and Task 3 resumed cleanly from that state using the plan file as the source of truth.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `app/app/(settings)/observedPatient/[patientId].tsx` is live and typed (`typedRoutes: true` in `app.config.ts`), ready for plan 06/07's `ObservedPatientCard` (or equivalent list-side component) to `router.push` into it with a `patientId` param.
- All six Home summary components' new optional props are backward compatible — `app/app/(tabs)/index.tsx` was verified untouched (`git diff --name-only` empty) after every task, and its existing calls compile without modification since every new prop defaults to the pre-existing behavior.
- **Not verified visually in a dev client** (no `npm run ios`/simulator run was performed in this session — worktree execution is CLI-only): the plan's `<verification>` block calls for a manual check that the main screen's "Все" buttons and card taps still work as before. `git diff --name-only "app/app/(tabs)/index.tsx"` being empty plus `tsc`/`eslint` passing gives strong static confidence, but an actual on-device/simulator pass of the main screen and the new detail screen (including the access-revoked `ErrorBoundary` path, which requires actually revoking a link while the screen is open) has not been done. Flagging for plan 07's end-to-end manual pass, per this plan's own `<context>` note that "Сквозной ручной прогон вынесен в план 07."
- **Known, pre-existing, out-of-scope blocker for a clean whole-project `tsc`:** see "Issues Encountered" above (`convex/observers/generateCode.ts` → missing `convex/utils/otp.ts`). Not introduced by this plan, but will surface again for whoever runs `npx tsc --noEmit` next at the phase level.

## Self-Check: PASSED

- `[ -f "app/app/(settings)/observedPatient/[patientId].tsx" ]` -> FOUND
- `git log --oneline` contains `68dac27`, `8858969`, `683438e` -> all FOUND
- All task-level `<acceptance_criteria>` re-run and passing:
  - Task 1: `readOnly` count 4/4/4 in the three files, eslint clean, `index.tsx` diff empty
  - Task 2: `readOnly` count ≥1 in both files (3, 6), `targets` count 9 in HomeMacroSummary, `useQuery` count 3 (≥1), eslint clean, `index.tsx` diff empty
  - Task 3: `getPatientToday` count 2, `readOnly` count 5 (≥5), `useMutation` count 0, `getProfile|getWeekMeals|getWeekReadings|getWeekMovement` count 0, eslint clean, no `_layout.tsx` created
- Plan-level `<verification>` block re-run and passing (only the pre-existing unrelated `tsc` error remains, documented above)

---
*Phase: 06-observer-access*
*Completed: 2026-08-16*
