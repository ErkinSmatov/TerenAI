---
phase: 06-observer-access
plan: 04
subsystem: ui
tags: [expo-router, react-native, convex, settings, observer-access]

# Dependency graph
requires:
  - phase: 06-observer-access (plan 02)
    provides: "api.observers.{generateCode,regenerateCode,getMyObservers,revokeLink} — patient-side Convex functions with exact return shapes documented in 06-02-SUMMARY.md"
provides:
  - "app/app/(settings)/observerCode.tsx — patient's 'Мой код' screen: permanent code display, native share, manual rotation with confirmation, connected-observer roster, revoke-with-confirmation"
  - "components/observer/ObserverListItem.tsx — presentational observer roster row (name, linkedAt, 44x44 revoke button behind AlertDialog)"
  - "Settings entry point: 'Доступ наблюдателя' item in the first SettingsGroup of app/app/(tabs)/settings.tsx"
affects: [06-05, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useMutation's return value is referentially stable (memoized internally by convex/react on [convex, functionName]), so a mount-once effect lists it in the dependency array instead of disabling react-hooks/exhaustive-deps — disabling that rule trips this project's react-compiler/react-compiler ESLint rule, which refuses to optimize any component containing a disabled hooks-rule comment"
    - "SettingsGroup's React.Children.toArray + cloneElement(child, { isLast }) auto-computes isLast from rendered position, so composing it with a component other than SettingsItem (here ObserverListItem) works at both runtime and type-check time as long as that component also accepts an isLast prop — no manual index math needed at the call site"

key-files:
  created:
    - components/observer/ObserverListItem.tsx
    - app/app/(settings)/observerCode.tsx
  modified:
    - app/app/(tabs)/settings.tsx
    - convex/utils/otp.ts (restored, see Issues Encountered)

key-decisions:
  - "generateCode's mount-effect dependency array is [generateCode], not [] — functionally identical (fires once, since the mutation reference is stable) but keeps react-hooks/exhaustive-deps satisfied without an eslint-disable, which the project's react-compiler ESLint rule treats as an error"
  - "Roster loading vs. empty vs. populated states distinguished by three-way branch (observers === undefined -> render nothing; .length === 0 -> empty-state text; else -> SettingsGroup of ObserverListItem) rather than a loading spinner, per plan's explicit requirement that undefined must not render as 'no observers'"
  - "Code digit skeleton implemented as a single WithSkeleton overlay across the whole 6-box row (skeletonStyle height 100, width 100%) rather than one skeleton per box — matches the plan's 'same height, no layout jump' requirement without inventing a new six-piece skeleton pattern"

patterns-established: []

requirements-completed: [OBSV-02, OBSV-07]

# Metrics
duration: ~45min active (across two sessions; interrupted by a session-limit API error between Task 1 and Task 2, resumed with full context intact)
completed: 2026-08-16
---

# Phase 6 Plan 04: Patient Observer-Code Screen Summary

**Patient-facing "Мой код" settings screen — permanent 6-digit code display with native share, manual rotation behind a consequence-warning dialog, and a connected-observer roster with confirmation-gated revoke — wired into Settings via a new entry point**

## Performance

- **Duration:** ~45 min active work (session interrupted by a session-limit API error after Task 1's commit; resumed cleanly from the committed state per coordinator's message, no rework needed)
- **Started:** 2026-08-15T13:20:00+05:00 (approx.)
- **Completed:** 2026-08-16T10:54:24+05:00
- **Tasks:** 2 (plus 1 prerequisite fix commit)
- **Files modified:** 4 (2 created, 1 modified, 1 restored)

## Accomplishments
- `components/observer/ObserverListItem.tsx` — presentational roster row: circular user-icon avatar, name (16/400), "Подключён {d MMMM}" date (12/400, `date-fns` + `ru` locale), and a 44×44 revoke button with `accessibilityLabel="Отозвать доступ"` wrapped in `AlertDialog` (destructive, verbatim Copywriting Contract text). Zero own queries/mutations — everything arrives via props, confirmed by `grep -c 'useQuery\|useMutation'` = 0
- `app/app/(settings)/observerCode.tsx` — full "Мой код" screen: calls `generateCode` once on mount into local `code` state, renders it as a static 6-box row (`OTPInput` metrics: height 100, `padding:12`/`paddingHorizontal:16`, row `gap:16`, digit 28/600) behind a `WithSkeleton` while loading, offers `Share.share()` and an `AlertDialog`-gated `regenerateCode` (non-destructive), and lists `getMyObservers` results through `ObserverListItem` inside `SettingsGroup` with a distinct empty-state string for the zero-observers case
- `app/app/(tabs)/settings.tsx` — added "Доступ наблюдателя" (`UsersIcon`) as a third item in the first `SettingsGroup`, visible on both platforms (unlike the iOS-only "Здоровье" item above it), with `isLast` moved onto it so the group's bottom divider stays correct
- Restored `convex/utils/otp.ts` (see Issues Encountered) — a prerequisite gap from plan 02 that blocked `npx tsc --noEmit` for the entire repo, not just this plan's files

## Task Commits

Each task was committed atomically:

1. **Prerequisite fix: restore convex/utils/otp.ts** - `cbac955` (fix) — superseded content-wise by the orchestrator's direct commit `523756a` to main; left as-is per orchestrator instruction, identical content merges cleanly
2. **Task 1: Компонент строки наблюдателя с кнопкой отзыва** - `d32391b` (feat)
3. **Task 2: Экран «Мой код» и точка входа в настройках** - `0b700b9` (feat)

**Plan metadata:** commit follows this SUMMARY.

## Files Created/Modified
- `components/observer/ObserverListItem.tsx` - Presentational observer roster row with revoke confirmation
- `app/app/(settings)/observerCode.tsx` - Patient's "Мой код" screen (code, share, rotate, roster, revoke)
- `app/app/(tabs)/settings.tsx` - Added "Доступ наблюдателя" entry point, moved `isLast`
- `convex/utils/otp.ts` - Restored (see Issues Encountered); not part of this plan's own scope

## Decisions Made
- `useEffect(() => { void generateCode().then(setCode); }, [generateCode])` instead of an empty-array + eslint-disable: `convex/react`'s `useMutation` memoizes its return value on `[convex, functionName]` (verified in `node_modules/convex/dist/esm/react/client.js`), so the reference never changes across re-renders — the effect still fires exactly once on mount, but without triggering `react-compiler/react-compiler`'s "skipped optimizing, ESLint rule disabled" error that an `eslint-disable-next-line react-hooks/exhaustive-deps` comment causes in this project's config.
- Reused `SettingsGroup` as the wrapper for `ObserverListItem` rows rather than hand-rolling `isLast` index math: `SettingsGroup`'s `React.cloneElement(child, { isLast: index === items.length - 1 })` doesn't care that its children are typed as `ComponentProps<typeof SettingsItem>` internally (the cast is unchecked at the call site since `SettingsGroup`'s own `children` prop is just `ReactNode`) — it works correctly with any component accepting an `isLast?: boolean` prop, which `ObserverListItem` does.
- Primary/secondary action buttons use `variant="primary"`/`variant="secondary"` with `size="base"` (no explicit height), directly mirroring `health.tsx`'s single-CTA button — the plan didn't specify a size and this is the cited screen-shell analog.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored missing `convex/utils/otp.ts`**
- **Found during:** Task 1 (running `npx tsc --noEmit` before any acceptance-criteria checks)
- **Issue:** `convex/observers/generateCode.ts` (committed in plan 02, commit `dae1a5f`) imports `generateNumericToken` from `../utils/otp`, but `convex/utils/otp.ts` itself was never committed to git — it existed only as an untracked file in the main repo's working directory, acknowledged in `06-02-SUMMARY.md`'s "Deviations" section as a Convex-codegen side effect but never actually added. A fresh worktree checkout (this one) therefore failed `npx tsc --noEmit` repo-wide and would have crashed at runtime on `generateCode`/`regenerateCode`.
- **Fix:** Restored the file with content identical to the main repo's untracked version (verified by direct comparison) and to the reference implementation already quoted verbatim in `06-PATTERNS.md`.
- **Files modified:** `convex/utils/otp.ts`
- **Verification:** `npx tsc --noEmit` clean before and after re-confirmed against Task 2's changes
- **Committed in:** `cbac955` (separate prerequisite commit, before Task 1's own commit)
- **Note:** Mid-execution, the orchestrator independently discovered and fixed this same gap, committing identical content directly to `main` as `523756a`. Per orchestrator instruction, `cbac955` is left in this branch's history as-is — the content is identical, so the merge will be a no-op on this file.

---

**Total deviations:** 1 auto-fixed (1 blocking, pre-existing gap from plan 02, unrelated to this plan's own file scope)
**Impact on plan:** Necessary to make `npx tsc --noEmit` — a required verification step for both of this plan's tasks — pass at all. No scope creep into plan 04's actual UI work.

## Issues Encountered
- ESLint's `react-compiler/react-compiler` rule errors on any component containing an `eslint-disable-next-line react-hooks/exhaustive-deps` comment ("React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled"). Initial draft of `observerCode.tsx` disabled that rule to get an empty-array mount effect; fixed by listing the (referentially stable) `generateCode` mutation function in the dependency array instead, which is behaviorally equivalent and lint-clean. Re-verified `npx eslint` clean.
- This worktree had no `node_modules` (git worktrees don't share installed dependencies) and no prior `.expo/types` directory (Expo Router's typed-routes output). `npm install` was run to unblock `tsc`/`eslint`; the new `/app/(settings)/observerCode` route resolved fine as an `Href` literal without regenerating `.expo/types`, consistent with how the pre-existing `/app/(settings)/health` route already resolved before this plan's changes — typed-route strictness apparently isn't enforced by `tsc` until `.expo/types` exists, so no `expo start`/typegen step was needed.
- Session was interrupted by a session-limit API error immediately after Task 1's commit (`d32391b`). Resumed per the coordinator's message with Task 1 fully intact; no rework was needed. The `otp.ts` fix commit (`cbac955`) predates that interruption and is independent of it.

## User Setup Required

None - no external service configuration required. The screen calls Convex functions already deployed to the dev deployment by plan 02.

## Next Phase Readiness
- `components/observer/ObserverListItem.tsx` is ready for reuse verbatim if a future plan needs the same row shape elsewhere (props: `displayName`, `linkedAt`, `onRevoke`, `isLast?`).
- The patient side of the observer-access feature (OBSV-02, OBSV-07) is now fully reachable from Settings and functionally complete pending the observer side (plan 03, already executed per STATE.md) and any remaining end-to-end manual verification.
- Not verified in this session (no dev client available in this environment): the visual appearance of the code block, native `Share.share()` sheet behavior, and the actual regenerate/revoke round-trip against a running app. Plan 07's end-to-end manual pass should cover this explicitly — `npx tsc --noEmit` and `npx eslint` are clean, and all grep-based acceptance criteria pass, but nothing was rendered on a simulator/device.
- No blockers for downstream plans.

## Verification Evidence

```
npx tsc --noEmit                                                                              → clean (no output)
npx eslint "app/app/(settings)/observerCode.tsx" "app/app/(tabs)/settings.tsx" components/observer/  → clean (only baseline-browser-mapping info notice)
grep -c 'accessibilityLabel' components/observer/ObserverListItem.tsx                         → 1
grep -c 'Отозвать доступ' components/observer/ObserverListItem.tsx                            → 2
grep -c 'useQuery\|useMutation' components/observer/ObserverListItem.tsx                      → 0
grep -c 'observerCode' "app/app/(tabs)/settings.tsx"                                           → 1
grep -c 'generateCode\|regenerateCode\|getMyObservers\|revokeLink' "app/app/(settings)/observerCode.tsx" → 8
grep -c 'Поделиться кодом' "app/app/(settings)/observerCode.tsx"                               → 1
grep -c 'Обновить код доступа' "app/app/(settings)/observerCode.tsx"                           → 1
grep -c 'TextInput' "app/app/(settings)/observerCode.tsx"                                      → 0
git diff --name-only components/settings/SettingsItem.tsx                                      → (empty — untouched)
```

## Self-Check: PASSED

---
*Phase: 06-observer-access*
*Completed: 2026-08-16*
