# Deferred Items — Phase 68 (Apple Health)

Out-of-scope discoveries logged during plan execution, not fixed (SCOPE BOUNDARY rule — only files touched by the current task are in scope).

## Pre-existing lint debt (confirmed independently by plans 68-01 and 68-02)

`npx eslint .` (full-repo run) reports 8 pre-existing errors unrelated to either plan's files:

- `app/app/(meal)/confirm-meal.tsx:199,225,232,237,240` — `@typescript-eslint/no-confusing-void-expression` (arrow function shorthand returning void)
- `app/auth/confirm-phone.tsx:92` — `@typescript-eslint/no-floating-promises`
- `components/meal/ConfirmMealItems.tsx:170,184` — `@typescript-eslint/no-confusing-void-expression`

None of these files are in either plan's `files_modified` list:
- 68-01: `lib/hooks/useHealthKitSync.ts`, `lib/health/healthKit.ts`, `lib/health/logHealthKitSync.ts`
- 68-02: `lib/utils/getLocalMonthBounds.ts`, `convex/utils/localMonthBounds.ts`, `scripts/verifyMonthBucketing.ts`, `package.json`

`npx eslint` on each plan's own task-specific files is clean. Not fixed here — carried forward for a future cleanup pass.
