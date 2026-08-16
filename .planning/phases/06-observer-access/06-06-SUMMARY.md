---
phase: 06-observer-access
plan: 06
subsystem: ui
tags: [expo-router, react-native, convex, observer-access, otp]

# Dependency graph
requires:
  - phase: 06-observer-access
    provides: "api.observers.redeemCode/getObservedPatients/revokeLink (plan 03); app/app/(settings)/observedPatient/[patientId] detail route (plan 05)"
provides:
  - "components/observer/ObservedPatientCard.tsx — presentational card: today's calories/meals/glucose/steps + amber/red warning badges, links to the patient detail route, AlertDialog-confirmed removal"
  - "app/app/(settings)/observedList.tsx — observer's list screen: three-state render (loading/empty/populated), inline 6-digit code redemption, per-branch error handling"
  - "components/home/HomeHeader.tsx onPress wired to /app/(settings)/observedList — closes the phase's navigation chain from the main screen"
affects: [06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline-card toggle for OTP entry (useState boolean) instead of BottomSheet — no existing BottomSheet precedent in the codebase for a code-entry flow specifically, and the plan explicitly allowed either; inline keeps the list screen self-contained with no extra ref plumbing"
    - "Single flashError() call before the error-message if/else chain (not repeated per branch) — functionally fires for all three error paths since it precedes the branching, while keeping the catch block linear"

key-files:
  created:
    - components/observer/ObservedPatientCard.tsx
    - app/app/(settings)/observedList.tsx
  modified:
    - components/home/HomeHeader.tsx

key-decisions:
  - "ObservedPatientCard's patient prop is typed via a locally-defined ObservedPatient type (exported) matching getObservedPatients' return item shape field-for-field, rather than inferring through Convex's FunctionReturnType utility — no prior component in the codebase types its props that way (every existing Home component defines an explicit local Props type against Doc<...> or hand-written shapes), so this follows established convention. Structural typing means passing a useQuery result item directly still type-checks with no cast."
  - "Metric-row icons (flame/utensils/droplet/footprints inside the 32x32 circles) use getColor(\"mutedForeground\") rather than a role color (contrast with HomeGlucoseSummary's blue droplet or HomeMovementSummary's green icons) — UI-SPEC restricts accent/role colors on this card to the two warning badges only ('Имя пациента, значения метрик, иконка удаления — нейтральная палитра'), so metric icons stay neutral to keep the badge the only colored signal on the card."
  - "Code-entry UI is an inline Card toggled by local state, not a BottomSheet — grepped the codebase for BottomSheet usage (app/auth/index.tsx sign-in picker, PlanInfoSheet) and found no code-entry precedent, so took the plan's explicit inline-card option rather than introducing new ref/present() plumbing for a single OTPInput."

patterns-established:
  - "Warning badge (amber/red, 12/400 text, 14px TriangleAlertIcon, 8px padding, 4px icon-text gap, getColor(name, 0.12) background) — first accent-colored UI in the app reserved to a specific data-flag signal, per UI-SPEC's 'color is for data, not chrome' rule; reusable if a future phase needs another server-computed warning flag surfaced on a card."

requirements-completed: [OBSV-03, OBSV-04, OBSV-05, OBSV-07]

# Metrics
duration: ~30min
completed: 2026-08-16
---

# Phase 6 Plan 06: Observer List, Card, and Navigation Entry Summary

**The phase's face: a patient card showing today's calories/meals/glucose/steps with server-computed warning badges, an observer list screen with inline 6-digit code redemption, and the main-screen header button wired to open it — closing OBSV-03/04/05/07 and the full navigation chain**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-16T11:00:00Z (approx.)
- **Completed:** 2026-08-16T11:10:00Z
- **Tasks:** 3 (plus one same-session style fix, see Deviations)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `ObservedPatientCard`: presentational component (zero `useQuery`/`useMutation` calls — verified by grep) rendering patient name, a 4-metric row (calories with target, meal count, glucose gated on `isGlucometerTrack`, steps gated on `steps !== null`), and up to two warning badges (`isCaloriesExceeded` → amber "Превышены калории", `isGlucoseOutOfRange` → red "Глюкоза вне нормы"), driven entirely by server-computed flags — no `thresholds`/`GLUCOSE_RANGES` import (grep = 0). Whole card is a `Link asChild` into `/app/(settings)/observedPatient/[patientId]`; a nested 44×44 delete button (`AlertDialog`-confirmed, `accessibilityLabel="Убрать из списка наблюдаемых"`) removes the patient without following the card's own link.
- `observedList.tsx`: new route with three distinguishable states — `patients === undefined` renders nothing (no premature empty-state flash), `patients.length === 0` renders the empty-state copy + "Ввести код" CTA, non-empty renders one `ObservedPatientCard` per item keyed by `linkId` plus the same CTA below the list (so a second/third code can be redeemed without leaving the screen).
- Code redemption: tapping "Ввести код" swaps the button for an inline `Card` containing a 6-digit `OTPInput` (`autoFocus`). `onFilled` calls `await redeemCode({ code })` inside `try/catch` (no `void redeemCode(` anywhere — grep = 0); on success the input closes and the list updates itself via Convex's reactive subscription (no manual refetch). The catch block distinguishes `"Code not found"`, `"Cannot observe yourself"`, and a general fallback (which also covers the plan-03 rate-limit throw), each pairing `inputRef.current?.flashError()` with the exact toast copy from the UI-SPEC Copywriting Contract.
- `revokeLink` errors get the same general-fallback toast; success shows nothing (the card's disappearance is the confirmation), matching the plan's no-manual-refetch instruction.
- `HomeHeader.tsx`: the pre-existing streak button (previously `onPress`-less) now pushes to `/app/(settings)/observedList` and gained `accessibilityLabel="Кого я наблюдаю"`. No other line in the file changed — `git diff` confirms `styles`, the `getStreak` query, and the streak display are byte-for-byte untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Карточка наблюдаемого с метриками и бейджами предупреждений** - `6e72ebc` (feat)
2. **Task 2: Экран «Кого я наблюдаю» со списком, пустым состоянием и вводом кода** - `b8cd9a3` (feat)
3. **Task 3: Подключение кнопки в шапке главного экрана** - `50e28cc` (feat)

One same-session follow-up fix, applied and committed before this summary (see Deviations): `77025a5` (fix)

## Files Created/Modified
- `components/observer/ObservedPatientCard.tsx` - Presentational card component; exports `ObservedPatient` type for the shape it expects
- `app/app/(settings)/observedList.tsx` - Observer's list screen: query + two mutations, three-state render, inline OTP code entry
- `components/home/HomeHeader.tsx` - Added `onPress`/`accessibilityLabel` to the existing streak button; no other change

## Decisions Made
- See `key-decisions` in frontmatter: `ObservedPatient` type defined locally rather than via Convex's `FunctionReturnType` (no codebase precedent for the latter); metric-row icons kept neutral (`mutedForeground`) so the two warning badges remain the card's only colored signal, matching UI-SPEC's "color is for data, not chrome" constraint; inline `Card` chosen over `BottomSheet` for code entry since no BottomSheet precedent exists for a code-entry flow and the plan explicitly permitted either.
- `flashError()` is called once, before the three-way `if/else` on the error message, rather than once per branch — it still fires for every error path (all three), just written without repetition. Interpreted the acceptance criterion ("flashError() вызывается во всех трёх ветках ошибок") as a behavioral requirement, not a textual repetition requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Style bug, caught by self-review, not a plan rule] Removed `alignItems: "center"` override on the code-entry Card**
- **Found during:** post-Task-2 self-review, before moving to Task 3
- **Issue:** The inline code-entry `Card` had a custom `codeCard` style with `alignItems: "center"`. `Card`'s default flex-column layout relies on the default cross-axis `stretch` to give `OTPInput`'s row (six `flex: 1` boxes) the full card width; overriding to `"center"` would have shrunk that row to its content width, squishing the six digit boxes instead of spacing them per `OTPInput`'s own `gap: 16` design.
- **Fix:** Removed the `codeCard` style object and the `style` prop on `<Card>`, letting the default `stretch` behavior apply.
- **Files modified:** `app/app/(settings)/observedList.tsx`
- **Verification:** `npx tsc --noEmit` and `npx eslint` both clean after the change; re-ran all Task 2 grep checks (`OTPInput` count 3, `length={6}` count 1, `void redeemCode(` count 0) — all still passing since the fix only touched styling, not the input/mutation wiring.
- **Committed in:** `77025a5` (separate fix commit, since Task 2's commit `b8cd9a3` was already made and the project's git rules disallow amending)

---

**Total deviations:** 1 auto-fixed (visual/layout correctness, no rule category — self-caught before it could ship visually broken)
**Impact on plan:** No scope creep; the fix only removes an incorrect style override, does not add new UI or behavior.

### Two ESLint-driven fixes (not scope deviations, applied inline before each task's commit)
- Task 2 and Task 3 each initially wrote `onPress={() => someSetter(value)}` — the project's `@typescript-eslint/no-confusing-void-expression` rule rejects returning a `void` expression from an arrow shorthand. Both fixed to `onPress={() => { someSetter(value); }}` before committing; no functional change, not mentioned as separate commits since they were caught and fixed pre-commit within each task's normal verify loop.

## Issues Encountered

None beyond the one style bug documented above. `npx tsc --noEmit` was clean on every run (including the run that specifically checks the two new typed routes — `/app/(settings)/observedList` and the object-form `Link` to `/app/(settings)/observedPatient/[patientId]` — both resolved without a manual cast).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The phase's full navigation chain is now code-complete: main screen → header button → `/app/(settings)/observedList` → `ObservedPatientCard` → `/app/(settings)/observedPatient/[patientId]` (plan 05's detail route) → back. All of it type-checks and lints clean.
- **Not verified visually in a dev client** (worktree execution is CLI-only, no `npm run ios`/simulator run performed in this session) — per this plan's own `<verification>` block and the worktree's `parallel_execution` note about typed routes: the orchestrator should confirm after merge that (a) the six-box `OTPInput` renders at full width now that the `alignItems: "center"` bug is fixed, (b) the empty-state and populated-list layouts match the UI-SPEC visually, (c) the warning badges' amber/red colors and 44×44 delete button hit area look correct on-device, and (d) the full tap chain (header → list → card → detail → back) navigates without a runtime error — the object-form `Link` `pathname: "/app/(settings)/observedPatient/[patientId]"` is statically verified to resolve under `tsc` but has not been exercised at runtime in this worktree.
- Rate-limit behavior (plan 03's `observerCodeRedeem`, 10/hour) is exercised by the general-fallback error branch in `handleFilled` but has not been triggered live in this session (would require 11 rapid redemption attempts against the dev deployment) — the branch is reached by any error message that doesn't match `"Code not found"` or `"Cannot observe yourself"`, which covers the rate-limiter's thrown error by construction, but this specific path is untested end-to-end.
- No blockers for plan 07 (the phase's end-to-end manual pass, per every prior plan's summary deferring visual/device verification there).

## Verification Evidence

```
npx tsc --noEmit                                                                    -> clean, all four times (once per task + once after the style fix)
npx eslint components/observer/ components/home/HomeHeader.tsx "app/app/(settings)/observedList.tsx"  -> clean (only baseline-browser-mapping info notice)
grep -c 'Превышены калории' components/observer/ObservedPatientCard.tsx             -> 1
grep -c 'Глюкоза вне нормы' components/observer/ObservedPatientCard.tsx             -> 1
grep -c 'accessibilityLabel' components/observer/ObservedPatientCard.tsx            -> 1
grep -c 'thresholds\|GLUCOSE_RANGES' components/observer/ObservedPatientCard.tsx    -> 0
grep -c 'useQuery\|useMutation' components/observer/ObservedPatientCard.tsx         -> 0
grep -c 'OTPInput' "app/app/(settings)/observedList.tsx"                            -> 3
grep -c 'length={6}' "app/app/(settings)/observedList.tsx"                          -> 1
grep -c 'Code not found\|Cannot observe yourself' "app/app/(settings)/observedList.tsx" -> 2
grep -c 'Вы пока никого не наблюдаете' "app/app/(settings)/observedList.tsx"        -> 1
grep -c 'flashError' "app/app/(settings)/observedList.tsx"                          -> 1
grep -c 'void redeemCode(' "app/app/(settings)/observedList.tsx"                    -> 0
grep -c 'observedList' components/home/HomeHeader.tsx                               -> 1
grep -c 'useRouter' components/home/HomeHeader.tsx                                  -> 2
grep -c 'accessibilityLabel' components/home/HomeHeader.tsx                         -> 1
grep -c 'getStreak' components/home/HomeHeader.tsx                                  -> 1
git diff components/home/HomeHeader.tsx (styles object)                             -> no changes (confirmed empty diff on styles block)
```

## Self-Check: PASSED

- `[ -f components/observer/ObservedPatientCard.tsx ]` -> FOUND
- `[ -f "app/app/(settings)/observedList.tsx" ]` -> FOUND
- `git log --oneline` contains `6e72ebc`, `b8cd9a3`, `50e28cc`, `77025a5` -> all FOUND
- All task-level `<acceptance_criteria>` re-run and passing (see Verification Evidence)
- Plan-level `<verification>` block re-run and passing

---
*Phase: 06-observer-access*
*Completed: 2026-08-16*
