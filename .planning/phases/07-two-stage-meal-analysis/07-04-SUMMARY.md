---
phase: 07-two-stage-meal-analysis
plan: 04
subsystem: frontend
tags: [react-native, expo-router, convex, ui, gesture-handler]

# Dependency graph
requires:
  - phase: 07-02
    provides: "detectMealFromPhoto/detectMealFromText no-DB-write actions"
  - phase: 07-03
    provides: "confirmMeal mutation (validate + persist + schedule background processing)"
provides:
  - "GramsStepper: +/-10g stepper with tap-to-edit numeric keyboard, clamped [1,1500]"
  - "ConfirmMealItems: editable ingredient list (skeleton, inline name edit, GramsStepper, swipe+button remove, add row, empty state)"
  - "confirm-meal.tsx route: uploads/detects on mount, local edit state, confirmMeal call, leave-confirmation dialog"
affects: [07-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bare react-native TextInput (not the boxed components/ui/TextInput) for inline name/grams edit to avoid double-nesting Card chrome"
    - "Gesture.Pan + scheduleOnRN swipe-to-remove pattern (from Toast.tsx) reused per-row alongside a visible X button, both calling the same onRemove"
    - "usePreventRemove + native Alert.alert as the leave-confirmation gate, distinct from the app's AlertDialog.tsx (trigger-based, not suited for imperative nav guards)"

key-files:
  created:
    - components/meal/GramsStepper.tsx
    - components/meal/ConfirmMealItems.tsx
    - app/app/(meal)/confirm-meal.tsx

key-decisions:
  - "Used expo-image's Image component for the photo preview (already an installed dependency, no existing in-app precedent for a static preview <Image> to follow, so used the standard Expo choice for React Native New Architecture apps)"

patterns-established:
  - "Detect-on-mount screens use a useRef started-flag (startedRef) to guard the auth+rate-limit+upload+detect sequence against double-invocation, exact precedent carried over from meal.tsx's startedRef"

requirements-completed: [MEAL-01, MEAL-02]

# Metrics
duration: 20min
completed: 2026-08-24
---

# Phase 7 Plan 04: Confirm-meal screen and its editable ingredient list components Summary

**Built the new confirmation screen (D-01) plus its two supporting components — GramsStepper.tsx and ConfirmMealItems.tsx — so the user sees an editable ingredient list within seconds of sending a photo or description, entirely client-local until they tap "Подтвердить".**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-24T11:06:00Z (approx.)
- **Completed:** 2026-08-24T11:27:37Z
- **Tasks:** 3 completed
- **Files modified:** 3 (all created)

## Accomplishments
- `GramsStepper.tsx`: ± buttons step by 10g, tap-to-edit switches to an inline `number-pad` `TextInput`, all paths clamp to `[1,1500]` matching the server-side bound in `detectMealItems.ts`/`selectCandidates.ts`/`confirmMeal.ts` (MEAL-02)
- `ConfirmMealItems.tsx`: skeleton (3 placeholder `Card` rows) while detecting, then an editable list — inline `TextInput` for the name, `GramsStepper` per row, both a swipe gesture and a `✕` button removing the same row, an add-ingredient row with the locked copy, and a locked-copy empty state that still exposes the add row (MEAL-01, MEAL-02)
- `confirm-meal.tsx`: uploads the photo (photo path, adapted from `meal.tsx`'s upload block) or forwards the description (text path), calls the correct no-DB-write detect action (`detectMealFromPhoto`/`detectMealFromText`), shows the ingredient list editable locally with zero AI re-calls on edit (D-10), calls `confirmMeal` on submit, and navigates to `/app/(meal)/meal` with `mealId` already resolved — hitting the existing `initialMealId` fast-path that skips analysis entirely (MEAL-01)
- Leave-confirmation dialog (D-06) via `usePreventRemove` + native `Alert.alert`, exact copy from RESEARCH.md Pattern 3
- Photo preview (`Card`-wrapped `Image`, `aspectRatio: 4/3`) rendered only when `photoUri` is present; nothing rendered for the text-description path (D-07)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GramsStepper.tsx** - `1b25b83` (feat)
2. **Task 2: Create ConfirmMealItems.tsx** - `e755b68` (feat)
3. **Task 3: Create confirm-meal.tsx — the D-01 confirmation screen** - `05c4a3a` (feat)

**Plan metadata:** (this commit, pending)

## Files Created/Modified
- `components/meal/GramsStepper.tsx` (new) - default component, props `{ value, onChange }`; two `44×44pt` stepper buttons and a tappable numeric value that opens an inline `number-pad` `TextInput` on tap, clamp `[1,1500]` applied on both the stepper delta and the manual-entry commit
- `components/meal/ConfirmMealItems.tsx` (new) - default component, props `{ items, loading, onChangeName, onChangeGrams, onRemove, onAdd }`; skeleton branch while `loading`, editable-row branch otherwise (`IngredientRow` sub-component wraps each row in a `GestureDetector`/`Gesture.Pan` for swipe-to-remove, exact pattern from `Toast.tsx:105-120`), add-row and empty-state branches per UI-SPEC locked copy
- `app/app/(meal)/confirm-meal.tsx` (new) - new Expo Router screen; `ScreenMain`/`ScreenHeader`/`ScreenFooter` scaffold (precedent: `fix-meal.tsx`); on-mount detect effect guarded by `startedRef`, adapted upload block from `meal.tsx` for the photo path; `handleConfirm` calls `confirmMeal` and navigates with `mealId`; `usePreventRemove` leave-confirmation dialog

## Decisions Made
- Used `expo-image`'s `Image` component for the photo preview Card — it's an already-installed dependency (`expo-image ~3.0.10`) and there was no existing in-repo `<Image>` usage precedent to copy for a static preview; this is the standard choice for Expo/New-Architecture apps and keeps the same visual contract (`aspectRatio: 4/3`, `borderRadius: 16` via the `Card`-wrapped layout) the UI-SPEC locks

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GramsStepper's inline TextInput needed local draft state instead of reading text off the blur/submit native event**
- **Found during:** Task 1
- **Issue:** `npx tsc --noEmit` failed with `Property 'text' does not exist on type 'TargetedEvent'` — `onBlur`'s `nativeEvent` on a bare `TextInput` is a `TargetedEvent`, not a `TextInputChangeEventData`, so the plan's suggested `e.nativeEvent.text` read doesn't type-check
- **Fix:** Added a `draft` local state string, bound via `value`/`onChangeText`, and had `onBlur`/`onSubmitEditing` both call a no-arg `commitEdit()` that reads `draft` instead of the event payload. Same clamp logic (`Math.max(1, Math.min(1500, parsed || 1))`) preserved exactly.
- **Files modified:** `components/meal/GramsStepper.tsx`
- **Commit:** `1b25b83` (folded into Task 1's initial commit — fixed before first commit, not a separate commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** None on scope or behavior — same clamp bounds and interaction model as specified, just a type-correct way to read the typed value.

## Issues Encountered
None beyond the type-correction above.

## User Setup Required
None - no external service configuration required, no new dependencies installed (all packages used — `@react-navigation/native`, `react-native-gesture-handler`, `react-native-worklets`, `expo-image`, `lucide-react-native`, `uuid` — were already present in `package.json`).

## Verification

`npx tsc --noEmit` passes for all three new files. The only remaining project-wide `tsc` errors are the two pre-existing, explicitly-expected ones in `app/app/(meal)/meal.tsx` referencing the now-deleted `api.meals.analyze.analyzeMealPhoto`/`analyzeMealDescription` (deleted in plan 07-02, resolved in plan 07-05) — confirmed out of scope for this plan per plan 07-02's and 07-03's summaries.

`camera.tsx`/`describe.tsx` still point at `/app/(meal)/meal` (unchanged by this plan) — `confirm-meal.tsx` is reachable only by direct navigation until plan 07-05 wires the entry points, matching this plan's own `<verification>` note.

## Next Phase Readiness
- Plan 07-05 can now update `camera.tsx`/`describe.tsx` to navigate to `/app/(meal)/confirm-meal` instead of `/app/(meal)/meal`, and can remove the now-dead photo-upload/`analyzeMealPhoto`/`analyzeMealDescription` block from `meal.tsx` (resolving the two expected `tsc` errors)
- `confirm-meal.tsx` is fully self-contained and does not require any further changes from plan 07-05 to function once entry points are re-wired
- No blockers for downstream plans

---
*Phase: 07-two-stage-meal-analysis*
*Completed: 2026-08-24*
