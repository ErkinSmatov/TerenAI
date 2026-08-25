# Deferred Items — Phase 68 (Apple Health)

Out-of-scope discoveries logged during plan execution, not fixed per SCOPE BOUNDARY rule
(only issues directly caused by the current task's changes are auto-fixed).

## From 68-02 (local month bounds)

`npx eslint .` (full-repo run) reports 8 pre-existing errors unrelated to this plan's files:

- `app/app/(meal)/confirm-meal.tsx:199,225,232,237,240` — `@typescript-eslint/no-confusing-void-expression`
- `app/auth/confirm-phone.tsx:92` — `@typescript-eslint/no-floating-promises`
- `components/meal/ConfirmMealItems.tsx:170,184` — `@typescript-eslint/no-confusing-void-expression`

None of these files were touched by 68-02's tasks (`lib/utils/getLocalMonthBounds.ts`,
`convex/utils/localMonthBounds.ts`, `scripts/verifyMonthBucketing.ts`, `package.json`).
Confirmed pre-existing lint debt — `npx eslint` on the task-specific files themselves
is clean. Not fixed here; carried forward for a future cleanup pass.
