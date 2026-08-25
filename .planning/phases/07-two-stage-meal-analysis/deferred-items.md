# Deferred Items — Phase 07

Out-of-scope discoveries logged during plan execution. Per the executor's Scope
Boundary rule, these are NOT fixed inline — only issues directly caused by the
current task's changes are auto-fixed.

## From plan 07-08 (2026-08-25)

`npm run lint` does not exit 0 project-wide. Root-caused: 8 pre-existing lint
errors unrelated to this plan's changes, confirmed present at base commit
`fabf0de` (before 07-08 touched anything):

| File | Lines | Rule | Why deferred |
|------|-------|------|---------------|
| `app/app/(meal)/confirm-meal.tsx` | 202, 228, 235, 240, 243 | `@typescript-eslint/no-confusing-void-expression` | Pre-existing (verified via `git show ed614c6:...` and `git diff` — identical violations exist at the same logical statements before and after this plan's edits; only line numbers shifted due to unrelated additions elsewhere in the file) |
| `app/auth/confirm-phone.tsx` | 92 | `@typescript-eslint/no-floating-promises` | File not in this plan's `files_modified` list; `git diff --stat` shows zero diff — completely untouched |
| `components/meal/ConfirmMealItems.tsx` | 168, 181 | `@typescript-eslint/no-confusing-void-expression` | Plan 07-08 explicitly instructs "Do NOT modify `components/meal/ConfirmMealItems.tsx`" — fixing these would violate that constraint; `git diff --stat` shows zero diff |

All Convex and TypeScript files actually created/modified by plan 07-08 are
individually lint-clean (`npx eslint <file>` exits 0 for each — verified for
all 10 modified files plus `confirm-meal.tsx`, which contains zero *new*
lint violations from this plan's diff).

Recommendation: a future cleanup pass (or a dedicated lint-debt plan) should
add braces to the five arrow-function-shorthand callsites in
`confirm-meal.tsx` / `ConfirmMealItems.tsx` and fix the floating promise in
`confirm-phone.tsx`. None of these are security- or correctness-relevant —
they are `no-confusing-void-expression` / `no-floating-promises` style rules.
