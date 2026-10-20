---
phase: 72-push-testflight-telegram-whatsapp-otp
reviewed: 2026-10-20T00:00:00Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - .gitignore
  - app.config.ts
  - app/app/(settings)/adjustMacroTargets.tsx
  - app/app/(settings)/changeGoal.tsx
  - app/auth/confirm-phone.tsx
  - app/auth/phone-sign-in.tsx
  - components/onboarding/OnboardingSectionLayout.tsx
  - components/onboarding/steps/end/OnboardingPlan.tsx
  - components/onboarding/steps/goal/OnboardingWeightChangeRate.tsx
  - components/ui/BottomSheet.tsx
  - config/testingConfig.ts
  - convex/TelegramOTP.ts
  - convex/WhatsAppOTP.ts
  - convex/auth.ts
  - convex/notifications/checkPushReceipts.ts
  - convex/notifications/recordPushToken.ts
  - convex/notifications/sendPushNotification.ts
  - convex/notifications/sendTestPush.ts
  - convex/rateLimit.ts
  - convex/testing/getOrCreateReviewerPhoneUser.ts
  - convex/utils/otpErrors.ts
  - eas.json
  - google-services.json
  - lib/auth/otpErrorMessage.ts
  - lib/auth/phoneCountries.ts
  - lib/goal/goalDetails.ts
  - lib/ui/macroTileStyles.ts
  - scripts/checks/goal.check.mjs
  - scripts/checks/otpErrorMessage.check.mjs
  - scripts/checks/otpErrors.check.mjs
  - scripts/checks/phoneCountries.check.mjs
  - scripts/checks/pushConfig.check.mjs
findings:
  critical: 2
  warning: 7
  info: 4
  total: 13
status: issues_found
---

# Phase 72: Code Review Report

**Reviewed:** 2026-10-20
**Depth:** standard
**Files Reviewed:** 32 (OnboardingSectionLayout.tsx, macroTileStyles.ts and scripts/checks/*.mjs were not examined in detail: no defects were targeted there)
**Status:** issues_found

## Summary

The OTP provider code (Telegram and WhatsApp) has a sound structure: errors are classified, phone numbers are masked in logs, and there is a global limiter. The main gaps are server-side phone validation, DoS and abuse of the shared limiters, and the shared "phone-review" account. The push code is reasonable, but it does not link a token to a specific user across account switches. Two findings are rated Critical: CR-01 (phone-review, accepted risk T-72-31, concrete consequences) and CR-02 (hardcoded test password in the client bundle with the "password" provider enabled in prod).

## Critical Issues

### CR-01: phone-review shared account is reachable by anyone and carries real shared state (risk T-72-31 accepted by the user)

**File:** `convex/auth.ts:65-75`, `convex/testing/getOrCreateReviewerPhoneUser.ts:6-28`, `config/testingConfig.ts:5`
**Issue:** The risk of a no-code login is accepted. These concrete consequences are not covered by that acceptance, and the user should consciously accept them too:
1. Anyone who can read the repo or the JS bundle (testingConfig is imported on the client, see CR-02) can call `signIn("phone-review", {phone:"+77630000000"})` directly through the Convex client. They then get a full session in a single permanent prod account, with no connection to the UI.
2. The account is shared. Every such visitor can read and overwrite the profile, meals, weights and photos left by the reviewer or by previous visitors (completeOnboarding, updateProfile). This is a data-exposure and integrity problem for whatever is in the account at the time.
3. The shared quotas (aiFeatures 50 per day, keyed by userId) are consumed by outsiders, so the account can be taken out of service during review (DoS on the reviewer). The AI spend of that account is also paid by the project.
4. The push token (one per user, recordPushToken) is overwritten by whoever signed in last. The reviewer's notifications may go to someone else's device (see WR-05).
5. There is no way to turn it off. After review the provider stays in prod code with a permanent backdoor.
**Fix:** Enable the provider only for the review window and remove it afterwards. At minimum, gate it with an environment variable (`if (process.env.REVIEWER_LOGIN_ENABLED !== "true") return null;`), and make the phone number a Convex env variable instead of a constant in the repo. Reset the account data on a schedule, or via a cron that deletes meals, weights and photos. Consider also a non-guessable review-only value instead of a phone number.

### CR-02: Test credentials (testPassword) end up in the client bundle while the "password" provider is live in prod

**File:** `app/auth/phone-sign-in.tsx:41`, `config/testingConfig.ts:2-3`, `convex/auth.ts:44-62`
**Issue:** `phone-sign-in.tsx` imports the whole `testingConfig` object into the client for `reviewerPhone`. Metro does not tree-shake object properties, so `testEmail` and `testPassword` are shipped in the production bundle. The "password" ConvexCredentials provider accepts exactly this pair with no environment guard. It is also committed in plain text in the repo. Anyone who unpacks the IPA or APK, or reads the repo, can log in to the test account in prod with `terenaitesting@test.test / test-password-123`. This is a standing authentication bypass for that account, independent of the accepted T-72-31 risk.
**Fix:** Move `reviewerPhone` into a separate client-safe constant file, and keep `testEmail` and `testPassword` out of any client import. Read the credentials from Convex env variables (`process.env.TEST_EMAIL`, `process.env.TEST_PASSWORD`), and return `null` when they are unset (that is, in prod).
```ts
// config/reviewerConfig.ts (client-safe)
export const REVIEWER_PHONE = "+77630000000";
```

## Warnings

### WR-01: No server-side validation or normalization of the phone number; the per-phone limiter can be bypassed

**File:** `convex/TelegramOTP.ts:72-74`, `convex/WhatsAppOTP.ts:29-31`
**Issue:** The format check (`^\+[1-9]\d{7,14}$`) and the country whitelist exist only in the client (`phone-sign-in.tsx`). The server accepts any `identifier` string as it arrives and uses it as the `otpSend` limiter key. An attacker calling Convex directly can send `"+7 701 123 45 67"`, `"+77011234567 "`, `"+7(701)1234567"` and similar variants. Twilio and Telegram normalize these to the same number, but each variant gets a fresh limiter bucket. The 5 per hour limit per phone is bypassed, and the same victim can be spammed with codes (and the project billed, $0.01 per Telegram code and Twilio fees) up to the global limit. Non-CIS and premium-rate numbers are also not restricted server-side.
**Fix:** Validate and normalize before the limiter, in a shared helper used by both providers.
```ts
const E164 = /^\+[1-9]\d{7,14}$/;
if (!E164.test(phone)) fail("INVALID_PHONE");
```
Optionally restrict to the supported dial codes from `lib/auth/phoneCountries.ts`.

### WR-02: Limiters allow denial of service against a victim or against all users

**File:** `convex/rateLimit.ts:38-50`, `convex/TelegramOTP.ts:73-83`, `convex/WhatsAppOTP.ts:30-40`
**Issue:** (a) The per-phone limit is unauthenticated: an attacker can burn a victim's 5 per hour sends and block their login. (b) The global limit of 500 per day is a single counter. One script sending to 500 different numbers (each is a real paid code) shuts down OTP login for the whole product until the window resets, and the fixed window gives a burst reset at the day boundary. There is no per-IP limiting (not available in Convex actions) and no CAPTCHA or attestation. Also, both limiters are consumed before the config check and before the gateway call, so failed sends (CHANNEL_UNREACHABLE, outage) still burn quota, and the global counter is shared across the two channels.
**Fix:** Use a token bucket for `otpSend` with a smaller burst, and add a separate per-channel global counter. Consider alerting when `otpSendGlobal` is hit (it only logs), and restoring the quota on gateway failure. Long term, add attestation (App Attest or Play Integrity) before sending.

### WR-03: 4-digit OTP with 15-minute lifetime

**File:** `convex/TelegramOTP.ts:68-70`, `convex/WhatsAppOTP.ts:25-27`
**Issue:** The code space is 10,000 values. Brute-force protection rests only on the built-in failed-attempt limiter in @convex-dev/auth, which this phase neither verifies nor tests. Every new send (up to 5 per hour per phone, and WR-01 removes that bound) issues a new code with a fresh guess budget. The window is generous for a code that gives full account takeover of a phone-number account.
**Fix:** Use 6 digits (generateNumericToken(6) and the OTPInput length) or at least confirm the library's attempt limiter is active. Reduce `maxAge` to 5 minutes.

### WR-04: PII (full phone number) may reach logs through Twilio messages; fragile string-based error classification

**File:** `convex/WhatsAppOTP.ts:98-103`, `convex/utils/otpErrors.ts:54-57`
**Issue:** `message` from the Twilio response is written to the logs as is, and Twilio error messages often contain the full number (for example "The phone number +77... is not valid"). That defeats `maskPhone`. In `classifyTwilioError`, `message.includes("To")` is a case-sensitive substring match that also matches any message containing "To" in another word ("Total", "Too many", "Token"), so INVALID_PHONE can be returned for a config problem, and the real `To` error (21211, the usual invalid-number code) falls through to UNKNOWN.
**Fix:** Redact digits in the message before logging (`message.replace(/\+?\d[\d\s()-]{5,}/g, "[redacted]")`). Match explicit codes (21211, 21614, 60200 with a check on the parameter field `To`) instead of substrings.

### WR-05: A push token is not tied to a single user; it survives sign-out and account switching

**File:** `convex/notifications/recordPushToken.ts:34-60`, `convex/notifications/sendPushNotification.ts:157-176`
**Issue:** The record is looked up by `userId` only. The same device token can exist under several users (the user logs out and another one logs in on the same device, which also happens with the shared reviewer account from CR-01). There is no cleanup on sign-out. Reminders and badge notifications for user A are then delivered to the device now used by user B, which leaks content (meal and weight reminders). `deleteInvalidToken` uses `.first()` and deletes only one row, so duplicate rows of a dead token stay and are re-sent forever.
**Fix:** In `recordPushToken`, delete or reassign every row with the same `expoPushToken` that belongs to another user (query `byExpoPushToken`, collect, delete where `userId !== current`). In `deleteInvalidToken`, `collect()` and delete all matches. Remove the token on sign-out.

### WR-06: adjustMacroTargets can save zero targets if the profile has not loaded when the screen opens

**File:** `app/app/(settings)/adjustMacroTargets.tsx:60-69, 109-121`
**Issue:** `useState(targets?.calories)` and the others are initialised once. If `useQuery` is still loading on first render (cold start through a deep link, or cache miss), all four values stay `undefined` and are never synchronized when the profile arrives. Pressing "Готово" then writes `calories: 0, carbs: 0, protein: 0, fat: 0` over the real targets (`?? 0`). There is also no error handling in `handleDone`: a rejected mutation gives an unhandled rejection and no feedback.
**Fix:** Initialise state in an effect when `targets` first becomes defined (as `changeGoal.tsx` does with `hasHydratedRef`), disable "Готово" until the profile is loaded, and wrap the call in `tryCatch` with a Toast on error.

### WR-07: Unhandled errors in the post-login completion flow can strand the user

**File:** `app/auth/confirm-phone.tsx:105-118, 72-84`
**Issue:** The `void (async () => { await completeOnboarding(...) ... })()` block has no error handling. If `completeOnboarding` fails (network, validation), the promise rejects unhandled, `hasStartedCompletionRef` stays `true`, so there is no retry, and the user stays on the code screen while already signed in. The reviewer path has the same problem: after a failed sign-in `hasStartedReviewerSignInRef` is never reset, so the user can only leave the screen and come back. In `handleSubmit`, every error (including RATE_LIMITED or network failure) is shown as a wrong-code flash only.
**Fix:** Wrap in `tryCatch`, show a Toast, and reset the refs on failure. Distinguish "invalid code" from other errors when possible.

## Info

### IN-01: Receipts: a non-OK batch response is skipped without being counted

**File:** `convex/notifications/checkPushReceipts.ts:62-70`
**Issue:** When Expo responds with a non-OK status, the batch is dropped (`continue`) and the summary shows neither errors nor missing receipts for it, so `ok + error + missing` can be less than `total`. There is no retry, and `response.json()` is unguarded (an exception aborts all remaining batches). The `fetch` calls have no timeout either.
**Fix:** Count the batch size into a `failedBatches` or `missing` counter, and wrap the per-batch body in its own try/catch so one bad batch does not stop the others.

### IN-02: Push token regex rejects the newer `ExpoPushToken[...]` form

**File:** `convex/notifications/recordPushToken.ts:9`
**Issue:** Expo also issues `ExpoPushToken[...]` in some SDK versions. A valid token would be rejected with "Invalid push token format". The log line also stores a 7-character suffix (acceptable).
**Fix:** `/^Expo(nent)?PushToken\[[^\]]+\]$/`.

### IN-03: Zod schema is created on every render; `testingConfig` is a client import; leftover blank lines

**File:** `app/auth/phone-sign-in.tsx:42-43, 62-64`
**Issue:** `PhoneForm` is rebuilt on every render of the component and could be a module-level constant. Two blank lines after the imports.
**Fix:** Move `PhoneForm` to module scope.

### IN-04: Reviewer user lookup is an unindexed filter scan; CODE duplication

**File:** `convex/testing/getOrCreateReviewerPhoneUser.ts:13-16`, `convex/notifications/checkPushReceipts.ts:20-26`, `convex/notifications/sendPushNotification.ts:35-41`
**Issue:** `users` is scanned with `.filter` on every reviewer login (works only because the table is small now). The `chunk` helper is duplicated in two files. The `app.config.ts` still contains `usesAppleSignIn: false,  // было true` and a commented-out plugin with TODO, which are leftovers.
**Fix:** Use the `phone` index of the auth `users` table if available, extract `chunk` to a shared util, and remove the leftover comments.

## Notes on accepted items

- `google-services.json`: client configuration with a Firebase API key (restricted by package name and SHA in Google Cloud); accepted per the review brief. `.gitignore` correctly excludes Firebase Admin SDK keys.
- `eas.json`, `app.config.ts`: no secrets found. The Sentry token is read from the environment as intended.

---

_Reviewed: 2026-10-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
