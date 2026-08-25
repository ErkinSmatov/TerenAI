# Deferred Items — Phase 68

Out-of-scope discoveries found during execution. Not fixed (SCOPE BOUNDARY rule — only files touched by the current task are in scope).

## Plan 68-01

Pre-existing `npx eslint .` failures unrelated to `useHealthKitSync.ts`/`logHealthKitSync.ts` (files not touched by this plan):

- `app/app/(meal)/confirm-meal.tsx:199,225,232,237,240` — `@typescript-eslint/no-confusing-void-expression` (arrow function shorthand returning void)
- `app/auth/confirm-phone.tsx:92` — `@typescript-eslint/no-floating-promises`
- `components/meal/ConfirmMealItems.tsx:170,184` — `@typescript-eslint/no-confusing-void-expression`

None of these files are in this plan's `files_modified` list. Logged for a future cleanup pass, not blocking HEALTH-01.
