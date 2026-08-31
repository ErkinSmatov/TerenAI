---
phase: 69-onboarding-gamification
plan: 06
subsystem: notifications
tags: [expo-notifications, convex, push, expo-router, internalAction]

requires:
  - phase: 69-onboarding-gamification/69-01
    provides: "pushTokens table schema (byUserId, byExpoPushToken indexes)"
  - phase: 69-onboarding-gamification/69-03
    provides: "/app/(settings)/weeklyWeighIn route (deep-link target) and profiles.weighInRemindersEnabled/mealRemindersEnabled toggles"
provides:
  - "Client push permission request + Expo push token registration with timezone offset (components/notifications/NotificationsProvider.tsx)"
  - "Server upsert mutation with token-format and timezone-range validation (convex/notifications/recordPushToken.ts)"
  - "Internal-only Expo Push API transport with batching, retry-once, and DeviceNotRegistered cleanup (convex/notifications/sendPushNotification.ts)"
  - "Notification-tap navigation restricted to a whitelisted set of typed routes"
affects: [69-07, 69-08]

tech-stack:
  added: ["expo-notifications ~0.32.17"]
  patterns:
    - "internalAction with zero userId argument as the only way to reach an external push API — public mutation/action never exposes send capability"
    - "Notification tap data.url is compared against literal whitelisted strings before router.push, never passed through directly (avoids untyped-route navigation injection)"

key-files:
  created:
    - convex/notifications/recordPushToken.ts
    - convex/notifications/sendPushNotification.ts
    - components/notifications/NotificationsProvider.tsx
  modified:
    - package.json
    - package-lock.json
    - app.config.ts
    - components/RootLayoutProvider.tsx
    - convex/_generated/api.d.ts

key-decisions:
  - "Transport is a direct fetch to exp.host from an internalAction (no @convex-dev/expo-push-notifications component), per plan interfaces — pushTokens table already needed for timezoneOffsetMinutes, so a second token store would be redundant"
  - "deleteInvalidToken declared as a named internalMutation export in the same file as sendPushNotification, not a separate file, per plan instruction"
  - "getLastNotificationResponseAsync() used for cold-start tap despite @typescript-eslint/no-deprecated — kept literally as specified (plan acceptance criteria greps for this exact name) with a targeted eslint-disable-next-line and rationale comment, rather than switching to the non-deprecated sync getLastNotificationResponse()"

patterns-established:
  - "Pattern: Constants.expoConfig?.extra is Record<string, any> in @expo/config-types; narrow via an explicit local type (ExpoExtra) and `as ExpoExtra`, never `as any`, before reading nested fields"

requirements-completed: [PUSH-01]

duration: ~15min
completed: 2026-08-30
---

# Phase 69 Plan 06: Push Infrastructure Summary

**Installed `expo-notifications` (SDK 54-compatible ~0.32.17), added server-side token upsert with strict format/timezone validation, an `internalAction`-only Expo Push API transport with automatic DeviceNotRegistered cleanup, and a client provider that registers the token, re-registers on foreground (6h throttle), and routes notification taps only to a whitelisted set of typed screens.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3/3
- **Files modified:** 8

## Accomplishments
- `expo-notifications` installed via `npx expo install` (never plain `npm install`), resolving to `~0.32.17` — confirmed inside the SDK 54 compatibility line, not the SDK 57 `57.x` line available on npm; `app.config.ts` plugin entry added with adaptive-icon/color config
- `recordPushToken` mutation: authorized upsert by `getAuthUserId(ctx)`, rejects malformed Expo tokens (`ExponentPushToken[...]` regex) and out-of-range timezone offsets (`[-840, 840]`) before writing — no `userId` argument accepted from the client (closes IDOR path T-69-24)
- `sendPushNotification` internalAction: batches up to 100 messages per Expo Push API call, retries a failing batch once, logs and continues past unretryable batches, and deletes tokens whose ticket reports `DeviceNotRegistered` via the co-located `deleteInvalidToken` internalMutation — no public `action`/`mutation` exists in the file (closes spoofing/DoS path T-69-21)
- `NotificationsProvider`: requests notification permission (Android channel created first), registers the Expo push token plus `Date().getTimezoneOffset()`, re-registers on `AppState` `active` transitions no more than once per 6 hours, and navigates notification taps to `/app/(settings)/weeklyWeighIn` only when `data.url` literally equals that string, else falls back to `/app` — arbitrary payload strings never reach `router.push` (closes navigation-injection path T-69-23)
- Mounted `<NotificationsProvider />` inside `RootLayoutProvider`'s `SplashScreenController`/`ConvexAuthProvider` tree, next to `ToastProvider`/`PortalHost`, without reordering any existing provider

## Task Commits

Each task was committed atomically:

1. **Task 1: Установка expo-notifications и конфигурация приложения** - `1655160` (feat)
2. **Task 2: Серверная регистрация токена и транспорт отправки push** - `054f855` (feat)
3. **Task 3: Клиентская регистрация токена и обработка тапа по уведомлению** - `90cdce7` (feat)

## Files Created/Modified
- `package.json` / `package-lock.json` - `expo-notifications: ~0.32.17` added via `npx expo install`
- `app.config.ts` - `expo-notifications` plugin entry (icon/color) added to `plugins`, all other config untouched
- `convex/notifications/recordPushToken.ts` - authorized upsert mutation with token-format and timezone-range validation
- `convex/notifications/sendPushNotification.ts` - `internalAction` batched Expo Push API transport + `deleteInvalidToken` `internalMutation`
- `convex/_generated/api.d.ts` - regenerated via `npx convex codegen`
- `components/notifications/NotificationsProvider.tsx` - permission request, token registration, foreground re-registration, tap-to-navigate handling
- `components/RootLayoutProvider.tsx` - mounts `<NotificationsProvider />` inside the existing authenticated provider tree

## Decisions Made
- All prescribed values (token regex, timezone range, batch size, retry-once policy, 6h throttle) were fixed by the plan (D-10 discretion already resolved in `<interfaces>`) and implemented as written
- Three small local corrections during implementation to satisfy the project's existing ESLint config (`@typescript-eslint/no-unsafe-enum-comparison`, `@typescript-eslint/require-await`, `@typescript-eslint/no-deprecated`) without weakening type safety — see Deviations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unsafe enum comparisons and unsafe `any` flow in NotificationsProvider**
- **Found during:** Task 3, running `npx eslint components/notifications/NotificationsProvider.tsx`
- **Issue:** Comparing `Notifications.getPermissionsAsync()`'s `PermissionStatus` enum result against the string literal `"granted"` triggered `@typescript-eslint/no-unsafe-enum-comparison`; reading `Constants.expoConfig?.extra?.eas?.projectId` propagated an untyped `any` (project's `@expo/config-types` types `extra` as `Record<string, any>`), triggering `@typescript-eslint/no-unsafe-assignment`/`no-unsafe-member-access`; the notification handler's `async () => ({...})` with no `await` triggered `@typescript-eslint/require-await`
- **Fix:** Compared against `Notifications.PermissionStatus.GRANTED` (re-exported by `expo-notifications` from `expo-modules-core`) instead of the string literal; introduced a local `ExpoExtra` type and narrowed via `Constants.expoConfig?.extra as ExpoExtra | undefined` (never `as any` — verified `grep -c "as any"` returns 0); changed `handleNotification` to a non-async arrow returning `Promise.resolve({...})`
- **Files modified:** components/notifications/NotificationsProvider.tsx
- **Verification:** `npx tsc --noEmit` clean, `npx eslint components/notifications/NotificationsProvider.tsx components/RootLayoutProvider.tsx` clean
- **Committed in:** `90cdce7` (Task 3 commit)

**2. [Rule 1 - Bug] Suppressed a single deprecated-API lint error to keep the plan-mandated function name**
- **Found during:** Task 3, same eslint run
- **Issue:** `Notifications.getLastNotificationResponseAsync()` is flagged `@typescript-eslint/no-deprecated` by the project's ESLint config (pre-existing rule, not introduced by this plan); the plan's acceptance criteria explicitly grep for the literal string `getLastNotificationResponseAsync`, and the non-deprecated sync alternative (`getLastNotificationResponse()`) has a different name
- **Fix:** Added a single targeted `// eslint-disable-next-line @typescript-eslint/no-deprecated` with an inline rationale comment on that call only, per the codebase's existing precedent for scoped disables (`components/weight/WeightPicker.tsx:123`)
- **Files modified:** components/notifications/NotificationsProvider.tsx
- **Verification:** `npx eslint components/notifications/NotificationsProvider.tsx` clean; literal string `getLastNotificationResponseAsync` still present (grep -c returns 1)
- **Committed in:** `90cdce7` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — lint/type correctness, no logic change)
**Impact on plan:** Neither fix altered any prescribed behavior, threshold, or value from the plan. No scope creep.

## Issues Encountered

- **Pre-existing, out of scope:** `npx expo install --check` reports ~19 `expo-*` packages already outdated relative to the installed `expo@54.0.21` before this plan ran (confirmed via a check immediately before installing `expo-notifications`). `expo-notifications@~0.32.17` itself is *not* among the flagged packages — it resolved cleanly for the installed Expo SDK 54 line. Fixing the pre-existing mismatches would require a repo-wide `expo-*` version bump touching dozens of files unrelated to `files_modified` for this plan, and PROJECT.md explicitly constrains against major-version bumps during the stabilization milestone. Documented in `.planning/phases/69-onboarding-gamification/deferred-items.md`, not fixed.
- `npx eslint .` (repo-wide) still reports the same 8 pre-existing errors documented in 69-01-SUMMARY.md (`confirm-meal.tsx`, `confirm-phone.tsx`, `ConfirmMealItems.tsx`) — none of these files are touched by this plan; scoped lint on this plan's files is clean.

## User Setup Required

None — no external service configuration required. Real-device verification of the permission prompt, token registration, and notification tap (which cannot be exercised in the iOS Simulator) is explicitly deferred to plan 69-08 per this plan's own `<verification>` section.

## Next Phase Readiness
- `convex/notifications/recordPushToken.ts` and `convex/notifications/sendPushNotification.ts` (plus its `deleteInvalidToken` internalMutation) are the complete transport contract plan 69-07's cron job needs — it can call `internal.notifications.sendPushNotification.default` directly with `{ expoPushToken, title, body, data }[]` built from a `pushTokens` query joined against due reminders
- `NotificationsProvider` is mounted and will populate `pushTokens.timezoneOffsetMinutes` for any user who grants permission, which plan 69-07's cron already expects per 69-01's schema comment
- No blockers for plan 69-07

---
*Phase: 69-onboarding-gamification*
*Completed: 2026-08-30*

## Self-Check: PASSED

All created files verified present on disk (`convex/notifications/recordPushToken.ts`, `convex/notifications/sendPushNotification.ts`, `components/notifications/NotificationsProvider.tsx`); all three task commit hashes (`1655160`, `054f855`, `90cdce7`) verified present in `git log`.
