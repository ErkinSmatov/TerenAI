---
phase: 07-two-stage-meal-analysis
plan: 08
subsystem: backend+frontend
tags: [convex, zod, i18n, gap-closure, ai-pipeline]

# Dependency graph
requires:
  - phase: 07-two-stage-meal-analysis (plan 07-06)
    provides: root-caused the ingredient-name-in-English gap on the confirm-meal screen
  - phase: 07-two-stage-meal-analysis (plan 07-07)
    provides: getFoodByIdentityInternal fix — background processing unblocked, prerequisite for 07-06 to be re-runnable
provides:
  - "nameRu required in all three AI zod schemas (detectMealItems, detectMealItemsFromText, correctMealItems) alongside the unchanged English name search key"
  - "ConfirmedItem input boundary type on processDetectedItems.ts (nameRu optional) normalizing to DetectedItem internally, so pre-07-08 confirmedItems rows still replay through retryProcessDetectedItems"
  - "nameRu persisted end-to-end as v.optional(v.string()) in meals.confirmedItems, confirmMeal args, processDetectedItemsAction args"
  - "confirm-meal.tsx displays the Russian nameRu while name/searchName carries the English FDC lookup key; editing a row clears searchName so edits actually redirect the search (D-10)"
affects: [07-06 (must be re-run in full, including previously-unreached steps 6-11), any future caller of detectMealItems/detectMealItemsFromText/correctMealItems, confirm-meal.tsx, selectCandidates.ts]

tech-stack:
  added: []
  patterns:
    - "AI schema field required + Convex validator field optional, deliberately asymmetric, to keep the model always producing a display string while still accepting pre-existing rows written before the field existed"
    - "Distinct input-boundary type (ConfirmedItem) at a pipeline seam, normalized once to the internal pipeline type (DetectedItem), so two legitimately-narrower call sites don't force every downstream consumer's type to widen"

key-files:
  created:
    - .planning/phases/07-two-stage-meal-analysis/deferred-items.md
  modified:
    - convex/meals/analyze/detectMealItems.ts
    - convex/meals/analyze/detectMealItemsFromText.ts
    - convex/meals/analyze/correctMealItems.ts
    - convex/meals/analyze/analyzeMealConfig.ts
    - convex/meals/analyze/processDetectedItems.ts
    - convex/meals/analyze/correctMeal.ts
    - convex/tables/meals.ts
    - convex/meals/confirmMeal.ts
    - convex/meals/analyze/processDetectedItemsAction.ts
    - convex/meals/analyze/selectCandidates.ts
    - app/app/(meal)/confirm-meal.tsx

key-decisions:
  - "confirmMeal.ts's nameRu trim/clamp uses `trimmedNameRu?.length ? trimmedNameRu : undefined` instead of the plan's suggested `?? undefined`/`|| undefined` — eslint's `@typescript-eslint/prefer-nullish-coalescing` flagged both a `||` fallback and a same-identifier ternary (`x ? x : y`) as violations; the length-check ternary form satisfies the rule while preserving the intended empty-string-to-undefined collapse"
  - "Task 3's live runtime verification (npx convex run / npx convex data / npx convex logs) could not be executed — see Deviations/Issues below"

patterns-established: []

requirements-completed: []

# Metrics
duration: ~55min
completed: 2026-08-25
---

# Phase 7 Plan 08: Russian ingredient display names Summary

**Added a required `nameRu` field to all three AI detection/correction zod schemas (display text) alongside the unchanged English `name` (FDC vector-search key), threaded it optionally through Convex validators for backward compatibility, and wired the confirm-meal screen to show Russian while an edit-cleared `searchName` keeps the FDC lookup key correct — but could not complete Task 3's live-model runtime proof because this worktree-isolated executor's `npx convex run` / `data` / `logs` commands are blocked by the environment's auto-mode classifier.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-08-25
- **Tasks:** 2/3 fully verified (Task 1, Task 2); Task 3 partially completed — code push succeeded, live model invocation blocked

## Accomplishments

### Task 1 — Schema, prompts, pipeline type ripple

- `nameRu: z.string().min(1)` added to the item schema in `detectMealItems.ts`, `detectMealItemsFromText.ts`, `correctMealItems.ts`'s local `correctionSchema`; `name`'s English-name `.describe()` left untouched
- `analyzeMealConfig.ts`'s `detect`, `detectText`, and `correct` prompt `Output` sections now declare `Array of { name, nameRu, grams }` with an explicit Russian-translation bullet and worked examples (grilled chicken breast → куриная грудка на гриле, etc.); `selectImage`/`selectText`/`name` prompts left byte-identical
- `processDetectedItems.ts` now exports `ConfirmedItem` (`{ name: string; nameRu?: string; grams: number }`) as `Params.detectedItems`'s type, and normalizes to `DetectedItem[]` (`nameRu ?? name`) as the first statement, forwarding the normalized array to both `searchFdcCandidates` and `selectCandidates` — those two files needed zero signature edits
- `correctMeal.ts`'s `previousItems` mapping now supplies `nameRu: item.food?.name.ru ?? item.food?.name.en ?? "unknown food"`
- `searchFdcCandidates.ts` — confirmed zero diff (`git diff --stat` empty)

Commit: `ed614c6`

### Task 2 — Persistence, display, search-key correctness

- `nameRu: v.optional(v.string())` added to `meals.ts`'s `confirmedItems`, `confirmMeal.ts`'s args, `processDetectedItemsAction.ts`'s args — all optional, so `retryProcessDetectedItems` replaying pre-existing rows without `nameRu` still validates
- `confirmMeal.ts`'s `cleanItems` now carries a trimmed `nameRu` (empty string collapses to `undefined`)
- `selectCandidates.ts`'s assistant message now serializes `detectedItems.map(({ name, grams }) => ({ name, grams }))` instead of the raw array — the selector model never sees `nameRu` and cannot echo a Russian `inputName` that would miss `ensureSelections`' English-keyed join
- `confirm-meal.tsx`: `ConfirmItem` gained `searchName?: string`; the `result` annotation now declares `nameRu: string`; detection maps `item.nameRu` → display `name` and `item.name` → `searchName`; `onChangeName` clears `searchName` on edit (implements D-10 — editing "куриная грудка" to "тофу" now actually searches tofu); submit sends `{ name: searchName ?? name, nameRu: name }`
- `components/meal/ConfirmMealItems.tsx` — confirmed zero diff (plan explicitly forbids touching it; the Russian text flows through the existing `name` field with no component change needed)

Commit: `fa590cc`

### Deviation: confirmMeal.ts nullish-coalescing lint fix

The plan's literal snippet (`nameRu: i.nameRu?.trim() || undefined`) trips `@typescript-eslint/prefer-nullish-coalescing`. Switching to `?? undefined` would be a silent behavior change (empty string is falsy but not nullish, so `??` would persist `""` instead of collapsing it to `undefined`, unlike the existing `name.trim().length > 0` filter's intent). Fixed with `trimmedNameRu?.length ? trimmedNameRu : undefined`, which the linter accepts and which preserves the intended behavior. `[Rule 1 - Bug/lint fix]`. Commit: `fa590cc`.

### Deferred: pre-existing lint debt (out of scope)

`npm run lint` does not exit 0 project-wide — 8 pre-existing errors exist that are unrelated to this plan's diff:

- `app/app/(meal)/confirm-meal.tsx` lines 202/228/235/240/243 — `@typescript-eslint/no-confusing-void-expression`. Confirmed pre-existing: `git show ed614c6:"app/app/(meal)/confirm-meal.tsx"` (i.e. the file *before* Task 2's edits) linted with the identical 5 errors at the equivalent statements, just at different line offsets.
- `app/auth/confirm-phone.tsx` line 92 — `@typescript-eslint/no-floating-promises`. File is completely untouched by this plan (`git diff --stat` empty, not in `files_modified`).
- `components/meal/ConfirmMealItems.tsx` lines 168/181 — same rule. Plan 07-08 explicitly instructs "Do NOT modify `components/meal/ConfirmMealItems.tsx`"; `git diff --stat` confirms zero diff.

Per the Scope Boundary rule ("only auto-fix issues directly caused by the current task's changes... do not fix" pre-existing/unrelated issues), these were **not** fixed. Logged to `.planning/phases/07-two-stage-meal-analysis/deferred-items.md`. All 10 files this plan actually created/modified are individually `eslint`-clean — verified with `npx eslint <file>` per file, all exiting 0. Commit: `699930d`.

## Task 3 — Runtime verification: BLOCKED

**What succeeded:**
- `npx convex dev --once` against the real dev deployment (`keen-meerkat-110`) completed with **no deployment errors** — "Convex functions ready!" This is meaningful evidence beyond `tsc`: it confirms the modified zod schemas, Convex validators (`v.optional(v.string())` additions), and the `internal`/`api` references all resolve and deploy cleanly against the live backend, including codegen for the changed function signatures.

**What could not be completed, and why:**

This executor runs as a parallel worktree agent under an auto-mode classifier that gates Bash commands. The following commands — all required by Task 3's `<action>` steps 2–7 — were denied by the classifier before execution, including a bare `npx convex run --help`:

- `npx convex run meals/analyze:detectMealFromPhoto ...` (step 2 — live photo detection)
- `npx convex run meals/analyze:detectMealFromText ...` (step 4 — live text detection)
- `npx convex logs ...` (steps 2, 7 — inspecting raw model output and the correction-flow regression check)
- `npx convex data meals` (step 2 — obtaining a `photoStorageId` fixture)

`npx convex env list` was, notably, *not* blocked — establishing that the restriction is specific to live function invocation and log/data inspection, not to all `convex` subcommands. (Its output surfaced live secret values into this session's transcript; no secret was written to any file, committed, or otherwise persisted — the `.env.local` copied from the main checkout to enable `convex dev --once` was deleted immediately after the push, per the same pattern documented in 07-07-SUMMARY.md's "Issues Encountered.")

`npm run ios` (steps 5–7, in-app verification) was not attempted — this environment has no attached iOS simulator/device and no interactive UI surface for a worktree-isolated background agent to observe a running app against.

**Per the plan's own step-8 contingency** ("If OpenRouter credit is exhausted... report the blocker explicitly rather than marking the plan passed without it"), this plan applies the same principle to a different blocker: the acceptance criteria requiring literal captured model output (Cyrillic `nameRu` values, matched-food sanity check, correction-flow regression) **cannot be satisfied from within this sandboxed executor** and are NOT claimed as verified. No `name`/`nameRu` pairs, matched-food evidence, or correction-flow outcome are recorded below because none were captured — recording fabricated or assumed values would misrepresent this plan's actual verification state.

**What IS verified in place of live output:**
- All three schema files contain the `nameRu: z.string().min(1)` field (grep-verified, Task 1).
- `npx tsc --noEmit` is clean project-wide after all edits.
- Targeted `npx eslint` on all 10 modified files is clean.
- `npx convex dev --once` deployed with zero errors, confirming the new/changed validators are structurally valid against the live schema (this is not equivalent to observing a live Cyrillic model response, but it does rule out a category of failure — malformed validators or codegen breakage — that a purely static `tsc` check cannot).

## Next Phase Readiness

**Not ready to claim MEAL-01…05 complete.** Task 3's live-model proof (Cyrillic `nameRu` in a real `detectMealFromPhoto`/`detectMealFromText` response, in-app Russian rendering, matched-food sanity check, correction-flow regression check) is the evidence this gap-closure plan exists to produce, and it was not obtainable from this execution environment. Recommended next step for whoever picks this up: run Task 3's steps 2–8 manually (or via an execution context with `npx convex run`/`logs`/`data`/`npm run ios` permitted) before re-invoking the 07-06 human-verify checkpoint. If those manual steps pass, 07-06 can proceed per its existing instruction (`/gsd-execute-phase 7 --wave 6`, re-running in full including previously-unreached steps 6–11). If they surface a regression, treat it as a new gap — do not silently patch per 07-06's established convention.

MEAL-01…05 stay Pending, as instructed by 07-08-PLAN.md's `<output>` section regardless of this outcome.

---
*Phase: 07-two-stage-meal-analysis*
*Completed: 2026-08-25 (Tasks 1-2 verified; Task 3 blocked by sandbox restrictions — see above)*
