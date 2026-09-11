---
phase: 69-onboarding-gamification
plan: 08
subsystem: testing
tags: [manual-uat, expo-notifications, apns, convex-cron, expo-router, sign-in-with-apple]

# Dependency graph
requires:
  - phase: 69-onboarding-gamification
    provides: streak/header UI (69-02), weight+notification settings screens (69-03), badge awarding (69-04), badge celebration+showcase (69-05), push infrastructure (69-06), reminder crons (69-07)
provides:
  - Manual UAT sign-off for phase 69 (onboarding audit + push/weight/gamification device verification)
  - Fixed phone-number input mask on sign-in
  - Fixed SettingsToggleItem caption text clipping
  - Fixed push token registration firing before authentication
  - Confirmed working: real APNs Sandbox push delivery to a physical device for the `.dev` bundle variant
affects: [onboarding, auth, push-notifications, settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dev-client bundle id has a `.dev` suffix distinct from production — APNs keys, Apple Identifiers capabilities, and any topic-scoped Apple credential must be created per bundle-id variant, not just once for production"

key-files:
  created: []
  modified:
    - app/auth/phone-sign-in.tsx
    - components/settings/SettingsToggleItem.tsx
    - components/notifications/NotificationsProvider.tsx
    - TODO.md
    - .gitignore

key-decisions:
  - "Apple Sign In OAuth failure ('Регистрация не выполнена') is a pre-existing infra gap (no AUTH_APPLE_ID/AUTH_APPLE_SECRET configured in Convex), unrelated to anything phase 69 built — logged as a backlog item, not fixed in this phase"
  - "A vague, non-reproducible TestFlight crash report for `recordPushToken` mentioned by other testers is logged as a backlog investigation item, not fixed blind"
  - "Point-fixed the shared app/auth/phone-sign-in.tsx screen (outside components/onboarding/) rather than duplicating logic inside onboarding, since it's the actual screen the create-account step's phone flow reuses"

patterns-established:
  - "Any Apple-side capability/credential (Push key topic, Sign In with Apple Service ID/key) must explicitly target the dev bundle id (`com.codetau.terenai.dev`), not just the production one"

requirements-completed: [ONBOARD-01, WEIGH-01, WEIGH-02, PUSH-01, PUSH-02, MEALPUSH-01, MEALPUSH-02, BADGE-01, BADGE-02, BADGE-03, HEADER-01]

duration: ~2 days (spread over interactive device debugging sessions)
completed: 2026-09-11
---

# Phase 69, Plan 08: Manual UAT — onboarding audit, push/weight/gamification device verification

**Closed phase 69 via interactive manual UAT: confirmed real APNs push delivery on a physical device after resolving a bundle-id/topic mismatch, audited all 15 tracked onboarding TODO items (only 1 real defect), and fixed 3 bugs surfaced along the way.**

## Performance

- **Duration:** Spread across multiple interactive sessions (2026-09-08 to 2026-09-11), heavy on human-in-the-loop device testing and Apple Developer credential setup
- **Completed:** 2026-09-11
- **Tasks:** 3/3 (Task 1 human-verify onboarding audit, Task 2 auto TODO.md close-out + point fixes, Task 3 human-verify device UAT)

## Accomplishments

- Diagnosed and fixed a real push-delivery outage: Convex functions from phase 69 (badges, notifications) had never been deployed to the dev backend; after deploying, discovered the dev-client bundle id (`com.codetau.terenai.dev`) needed its own Sandbox APNs key scoped to that exact topic (a first key was mistakenly scoped to the production topic `com.codetau.terenai`, a second was created correctly) — confirmed via Expo Receipt API (`TopicDisallowed` → resolved) and later via a real scheduled meal-reminder push arriving on-device.
- Task 1 audit: walked through all 15 tracked onboarding TODO.md items live on-device; only 1 real defect reproduced (missing phone-number mask), the rest were already resolved/stale.
- Task 3 device UAT: confirmed weight update + goal recalculation with profile preservation, badge celebration (temporarily lowered thresholds to trigger it live), meal-reminder push delivery, and header/streak navigation — all 16 checklist points accepted.
- Fixed 3 real bugs surfaced during testing (see Deviations).

## Task Commits

1. **Task 1: onboarding audit** — no code commit (human-verify checkpoint; result recorded below)
2. **Task 2: TODO.md close-out + point fix** — `24b7915` (fix: phone mask), `a9b96d8` (docs: close 15 TODO items)
3. **Task 3: device UAT** — no code commit (human-verify checkpoint; result recorded below)

**Related fixes surfaced during UAT (not part of Task 2's TODO.md scope, but found and fixed in the same session):**
- `c26966e` fix(69-03): SettingsToggleItem caption text clipping
- `0f40415` fix(69-06): gate push registration on isAuthenticated (fixes a real Sentry-reported TestFlight "Unauthorized" error)
- `59e192d` chore: gitignore credentials.json (contained an EAS distribution-certificate password in cleartext; never committed, but wasn't ignored)

## Files Created/Modified

- `app/auth/phone-sign-in.tsx` — added `+7 XXX XXX XX XX` input mask (was raw, unformatted text entry requiring the user to type the country code themselves)
- `components/settings/SettingsToggleItem.tsx` — `minHeight` + vertical padding instead of fixed `height`, so long captions wrap instead of overflowing
- `components/notifications/NotificationsProvider.tsx` — gated push registration on `isAuthenticated`, re-fires on the false→true transition
- `TODO.md` — 15 onboarding items marked `[x]` after audit
- `.gitignore` — added `credentials.json`

## Decisions Made

- Apple Sign In button exists and is wired correctly client-side, but fails with a generic error because Convex has no `AUTH_APPLE_ID`/`AUTH_APPLE_SECRET` configured (confirmed via `npx convex env list` — only `AUTH_GOOGLE_*` present). Setting this up requires creating a separate Apple "Services ID" + Sign-in-with-Apple key + generating a client-secret JWT — out of scope for phase 69, logged as a backlog item.
- A vague "sometimes other TestFlight testers see an error" report (no repro steps) is logged for a future dedicated debugging session rather than guessed at.
- Left the two low-threshold test badges and widened reminder-window constants in place only for the duration of testing; fully reverted and redeployed before writing this summary (verified via `git diff` showing zero drift on `lib/notifications/reminderSchedule.ts` / `lib/badges/badgeDefinitions.ts` / `convex/notifications/sendPushNotification.ts`, and `script:verifyBadgeThresholds` / `script:verifyWeighInReminder` passing).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug found during verification] SettingsToggleItem caption overflow**
- **Found during:** Task 3 device UAT (user reported notification-settings text running past its container)
- **Issue:** Fixed `height: 52` on the row clipped/overflowed multi-line captions on narrower screens
- **Fix:** `minHeight: 52` + `paddingVertical: 8`
- **Files modified:** `components/settings/SettingsToggleItem.tsx`
- **Verification:** tsc + eslint clean; visually confirmed by user after Metro reload
- **Committed in:** `c26966e`

**2. [Rule 1 - Bug found during verification] Push registration fired before authentication**
- **Found during:** Task 3 device UAT — a real Sentry error from a TestFlight user (`recordPushToken` "Unauthorized") surfaced mid-session
- **Issue:** `NotificationsProvider` is mounted at the app root and attempted push-token registration unconditionally on mount, before the user signs in; `recordPushToken` requires auth and throws. Worse: retry was only wired to `AppState` "active" transitions, so a user who signs in without backgrounding the app never got a token registered that session.
- **Fix:** gated the registration effect on `isAuthenticated`, added it to the dependency array so it fires immediately on the false→true transition
- **Files modified:** `components/notifications/NotificationsProvider.tsx`
- **Verification:** tsc + eslint clean
- **Committed in:** `0f40415`

**3. [Rule 1 - Security hygiene] credentials.json not gitignored**
- **Found during:** Task 3 device UAT (EAS credential setup for the APNs key generated this file)
- **Issue:** `credentials.json` embeds the distribution certificate password in cleartext; `*.p8`/`*.p12` were already ignored but this manifest file wasn't. Never actually committed, but one accidental `git add -A` away from landing in history.
- **Fix:** added `credentials.json` to `.gitignore`
- **Files modified:** `.gitignore`
- **Verification:** `git log --all --full-history -- credentials.json` confirms it was never tracked
- **Committed in:** `59e192d`

**4. [Rule 3 - Defect found during Task 1 audit, point-fixed per plan's own Task 2 instructions] Phone number input had no mask**
- **Found during:** Task 1 onboarding audit (item "Onboarding create account")
- **Issue:** `app/auth/phone-sign-in.tsx` took raw unformatted text; user had to type the `+7` country code themselves with no grouping
- **Fix:** added `+7 XXX XXX XX XX` masking (auto-prefixed, digit-only extraction, strips a redundant leading 7/8, capped at 10 digits)
- **Files modified:** `app/auth/phone-sign-in.tsx` (not under `components/onboarding/` — this is the shared sign-in screen the onboarding create-account step navigates to; fixing it in place was correct rather than duplicating logic)
- **Verification:** tsc + eslint clean
- **Committed in:** `24b7915`

---

**Total deviations:** 4 auto-fixed (3× Rule 1, 1× Rule 3)
**Impact on plan:** All four were genuine defects surfaced by manual testing, not scope creep. No new features, no onboarding screens/steps added (per D-05).

## Issues Encountered

- **Convex functions never deployed to dev backend:** all of phase 69's Convex functions (badges, notifications) existed in code but had never been pushed via `npx convex dev` to the `keen-meerkat-110` dev deployment — executors had only run local `codegen`. Caused an immediate app crash (`Could not find public function for 'badges/getUnseenBadge'`) on first UAT run. Fixed by deploying; also cleaned up an unrelated stale index (`glucoseReadings.byHealthKitUuid`, renamed in phase 68, long before pushed).
- **Stale native/generated artifacts:** `.expo/types/router.d.ts` (gitignored Metro-generated route types) and the `ios/` native project's entitlements (gitignored, from `expo prebuild`) were both stale relative to code changes made earlier in phase 69 (route rename in 69-02, `expo-notifications` plugin in 69-06). Regenerated both (`expo start --web` once for router types; `expo prebuild` for entitlements) — no source changes needed.
- **APNs key topic mismatch:** Apple's Developer Portal has a hard cap of 2 "Team Scoped (All topics)" push keys per account, already exhausted by unrelated projects on this Apple ID. Worked around it with a Topic-scoped key (a separate quota bucket), but the dev-client's actual bundle id is `com.codetau.terenai.dev` (not `com.codetau.terenai`) — the first topic-scoped key was mistakenly scoped to the wrong bundle id, causing a silent `TopicDisallowed` failure only visible via Expo's Receipt API (the initial "ticket" response looks identical whether or not the topic is correct). A second, correctly-scoped key resolved it.
- **Apple Sign In has no server credentials configured** — see Decisions Made; logged as backlog, not fixed.

## User Setup Required

No `{phase}-USER-SETUP.md` was generated, but two items need the user's/team's own follow-up outside this phase:
- **Apple Sign In:** create a Services ID + Sign-in-with-Apple key in Apple Developer, generate the client-secret JWT, set `AUTH_APPLE_ID` / `AUTH_APPLE_SECRET` via `npx convex env set` (dev) and the production deployment.
- **Vague TestFlight error report** from other testers (no repro steps yet) — needs a dedicated debugging session once repro steps are available.
- A **Production** APNs key (topic-scoped to `com.codetau.terenai`, environment Production) still needs to be created before the next TestFlight/App Store push — only the Sandbox key (for `.dev`) was set up in this session, matching what was actually needed for device UAT.

## Next Phase Readiness

Phase 69 is fully verified end-to-end on a physical device: onboarding is clean (1 defect found and fixed), push notifications deliver correctly (Sandbox key + entitlements), weight updates preserve profile data, and gamification (badge celebration + showcase) works. Ready to close the phase and move to the next item in ROADMAP.md (Phase 67 — Дистрибуция и OTA-обновления).

---
*Phase: 69-onboarding-gamification*
*Completed: 2026-09-11*
