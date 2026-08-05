# Research: Guest/Anonymous Auth with @convex-dev/auth (+ future upgrade path)

**Scope:** Ecosystem/feasibility research for adding a silent guest session to the existing `@convex-dev/auth` setup in TerenAI, and the account-linking design needed by the *next* milestone (Apple/Google restoration). No general auth theory, no alternative backends.

**Researched:** 2026-08-05
**Overall confidence:** HIGH for provider existence/API/session mechanics (verified against installed package source `node_modules/@convex-dev/auth@0.0.90` and official docs source on GitHub). MEDIUM for the in-place linking pattern (mechanism verified by reading source of both the server and React client, but the maintainers' own test suite marks the equivalent test `test.todo(...)`, i.e. **not officially covered by their tests either** — treat as "should work per how the code is written," not "guaranteed by a passing upstream test").

---

## Verdict (one-liners for the roadmap)

- **Anonymous provider exists and ships in the installed version.** `^0.0.90` already contains `@convex-dev/auth/providers/Anonymous` — no upgrade needed.
- **In-place linking (same `userId` survives Google/Apple sign-in) is possible but not automatic.** It requires writing a custom `createOrUpdateUser` callback in `convex/auth.ts`. This callback **replaces all default account-linking logic**, so it must be written carefully to preserve existing behavior for Google/Apple/OTP/password, not just add the anonymous case.

---

## 1. Does `@convex-dev/auth` ship an Anonymous provider?

**Yes.** Confirmed two ways:
- Installed package: `node_modules/@convex-dev/auth/providers/Anonymous` exists, version `0.0.90` (matches `package.json`'s `^0.0.90` — no version bump needed).
- Official docs (`get-convex/convex-auth` repo, `docs/pages/config/anonymous.mdx`, fetched directly from GitHub raw): the provider is documented and stable enough to have its own docs page.

**Exact import path:**
```ts
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
```

**Exact `convex/auth.ts` addition** (minimal — just add `Anonymous` to the existing `providers` array; everything else in the file stays the same):

```ts
import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import Apple, { AppleProfile } from "@auth/core/providers/apple";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous"; // NEW
import { ResendOTP } from "./ResendOTP";
// ...unchanged imports...

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Apple({ /* unchanged */ }),
    ResendOTP,
    ConvexCredentials({ id: "password", /* unchanged, test-user only */ }),
    Anonymous, // NEW — add anywhere in the array, order doesn't matter here
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      // unchanged — see Q2 below for why this still works as-is
    },
  },
});
```

**Exact client call to start an anonymous session** (from `@convex-dev/auth/react`'s `useAuthActions()`, already imported in `context/AuthContext.tsx`):

```ts
const { signIn } = useAuthActions();
await signIn("anonymous");
```

No arguments are required. `signIn("anonymous", { token })` is only needed if you later add CAPTCHA/attestation (see Risks, Q6).

**Schema:** no change needed. `convex/schema.ts` already does `...authTables` from `@convex-dev/auth/server`, and `authTables.users` (source: `node_modules/@convex-dev/auth/src/server/implementation/types.ts:47`) already declares `isAnonymous: v.optional(v.boolean())`. The field is part of the library's base schema, not something this app added.

Source: `node_modules/@convex-dev/auth/src/providers/Anonymous.ts`, `docs/pages/config/anonymous.mdx` (github.com/get-convex/convex-auth).

---

## 2. Interaction with `afterUserCreatedOrUpdated` — will a `profiles` row be created?

**Yes, identically to any other new user — as long as you do NOT add a custom `createOrUpdateUser` callback.**

Mechanism (traced through `node_modules/@convex-dev/auth/src/providers/Anonymous.ts` and `.../server/implementation/users.ts`):

1. `Anonymous` is a thin wrapper around `ConvexCredentials` (`id: "anonymous"`). Its `authorize` calls `createAccount(ctx, { provider: "anonymous", account: { id: crypto.randomUUID() }, profile: { isAnonymous: true } })`.
2. `createAccount` → `upsertUserAndAccount` → `defaultCreateOrUpdateUser`. Since there's no existing account for that random UUID and no email/phone to match on, `existingUserId` is `null` → a **new** `users` row is inserted with `{ isAnonymous: true }`.
3. Because `existingUserId` was `null`, the config's `afterUserCreatedOrUpdated(ctx, { userId, existingUserId: null, type: "credentials", provider, profile: { isAnonymous: true } })` fires — **exactly the same code path a fresh Google/Apple/OTP sign-up takes.**
4. The current implementation in `convex/auth.ts` queries `profiles` for `userId`, finds none, and inserts `profilesConfig.defaultValues`. This will fire correctly for anonymous users with zero changes.

**Gotcha (important for the *next* milestone, not this one):** Per official docs (`docs/pages/advanced.mdx`, "Controlling user creation and account linking behavior"): *"When you provide this [`createOrUpdateUser`] callback, the library doesn't create or update users at all... `afterUserCreatedOrUpdated` is only called if `createOrUpdateUser` is not specified."*

This means: the moment you add a custom `createOrUpdateUser` (required for in-place linking, see Q3), the existing `afterUserCreatedOrUpdated` profile-bootstrap logic **silently stops running for every provider** — Google, Apple, OTP, password test-user, and anonymous alike. The profile-insert logic must be moved *inside* the new `createOrUpdateUser` callback (after `ctx.db.insert("users", ...)`/`ctx.db.patch(...)`, before `return userId`). This is not a bug you'd necessarily notice immediately — new users would simply never get a `profiles` row, and `useProfileStatus`/`app/app/_layout.tsx` would redirect them to onboarding forever without a way to save it (since `completeOnboarding`/`updateProfile` presumably `.patch` an existing profile row — verify this doesn't silently fail with a missing row before shipping the linking milestone).

**Flag for roadmap:** the guest-mode phase (this milestone) can ship with `afterUserCreatedOrUpdated` untouched. The linking phase (next milestone) MUST refactor profile creation into `createOrUpdateUser` in the same commit that adds it — treat these as inseparable.

---

## 3. Account linking / upgrade: keeping the same `userId`

### Verdict: NOT automatic, but achievable with a custom `createOrUpdateUser` callback. No first-class "link account" API exists.

**What does NOT work by default:** calling `signIn("google", {...})` while a client is authenticated as an anonymous user does **not** transfer data to the Google identity. The default `defaultCreateOrUpdateUser` (`node_modules/@convex-dev/auth/src/server/implementation/users.ts`) only links accounts by matching a **verified email or phone number** against existing users — it has no concept of "the currently active session." An anonymous user has no email, so signing in with Google from an anonymous session will, by default, create a **brand-new** `users` row (or link to a *different* pre-existing user if that Google email was already used before) and leave the anonymous user's data (meals, profile) permanently orphaned under the old `userId`.

**Official confirmation this needs custom code:** `docs/pages/config/anonymous.mdx`: *"If the client is currently authenticated as an anonymous user, and then signs in with another authentication method, the anonymous user can be converted to a normal user. To support this flow, you must provide a custom account linking implementation."* It links to `advanced.mdx#controlling-user-creation-and-account-linking-behavior`, which shows the `createOrUpdateUser` callback shape but — notably — **does not show the anonymous-specific linking code**. The library's own test suite has this exact scenario marked `test.todo` (unimplemented) in `test/convex/anonymous.test.ts`:
```ts
test.todo("convert anonymous user to permanent", async () => { ... });
```
There is also an **open, unanswered** GitHub issue (get-convex/convex-auth#231, "Transfer Anonymous to OAuth user," filed July 2025, zero responses as of this research) asking for exactly this. **Conclusion: this is a real gap in official documentation/testing, not something you're missing.** The mechanism below is inferred correctly from reading the source, but is unverified by upstream's own tests — budget time for manual QA in the roadmap phase that implements it.

### The mechanism that makes in-place linking work

`getAuthUserId(ctx)` (used everywhere in this codebase already) is just `ctx.auth.getUserIdentity()` decoded. Traced through `node_modules/@convex-dev/auth/src/react/client.tsx`: the existing OAuth flow in `components/auth/SignInButtons.tsx` makes **two** calls to `signIn()`:
1. `signIn(provider, { redirectTo })` → gets a redirect URL, opens it in `expo-web-browser`.
2. `signIn(provider, { code })` → exchanges the code for tokens.

Both calls go through `client.authenticatedCall("auth:signIn", ...)` — i.e. both carry whatever auth token is **currently attached to the `ConvexReactClient`**. Nothing in the client clears the token between step 1 and step 2 (`setToken` is only called *after* new tokens come back in step 2). So if the user was signed in anonymously before tapping "Continue with Google," the anonymous JWT is still attached when step 2's mutation runs server-side — meaning `getAuthUserId(ctx)` inside a custom `createOrUpdateUser` callback **will correctly return the anonymous user's ID**, because Convex propagates the request's `ctx.auth` identity through internal `ctx.runMutation` calls.

### Exact `createOrUpdateUser` callback (for the *next* milestone, documented now because it changes how `convex/auth.ts` must be structured)

This callback **replaces all default linking behavior** — it must reimplement the app's current trusted-email-linking behavior (Google/Apple/OTP are "trusted" providers per Convex Auth's own default rules) in addition to the new anonymous-upgrade case, or Google/OTP sign-in for returning non-guest users will regress (duplicate user rows on repeat sign-in).

```ts
// convex/auth.ts (next-milestone addition, sketch)
import { getAuthUserId } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Apple({ /* ... */ }), ResendOTP, ConvexCredentials({ /* password */ }), Anonymous],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const { existingUserId, profile, provider } = args;

      // 1. Account already linked to a user (repeat sign-in with a known provider) — no-op.
      if (existingUserId !== null) {
        return existingUserId;
      }

      // 2. NEW: upgrade path. If the client is currently an anonymous session,
      //    reuse that userId instead of minting a new one.
      const currentUserId = await getAuthUserId(ctx);
      if (currentUserId !== null && provider.id !== "anonymous") {
        const currentUser = await ctx.db.get(currentUserId);
        if (currentUser?.isAnonymous) {
          await ctx.db.patch(currentUserId, {
            isAnonymous: false,
            email: typeof profile.email === "string" ? profile.email : undefined,
            name: typeof profile.name === "string" ? profile.name : undefined,
            ...(profile.emailVerified ? { emailVerificationTime: Date.now() } : {}),
          });
          // Manually run the profile-bootstrap logic that afterUserCreatedOrUpdated
          // used to do, since that callback no longer fires once this one exists.
          return currentUserId;
        }
      }

      // 3. Reimplement default trusted-email linking (Google/Apple/OTP are
      //    "trusted" by default; this app doesn't set allowDangerousEmailAccountLinking:false).
      if (typeof profile.email === "string") {
        const existing = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", profile.email as string))
          .filter((q) => q.neq(q.field("emailVerificationTime"), undefined))
          .first();
        if (existing) return existing._id;
      }

      // 4. Fresh user (first-ever sign-in, not from a guest session).
      return ctx.db.insert("users", {
        ...profile,
        ...(profile.emailVerified ? { emailVerificationTime: Date.now() } : {}),
      });
    },
  },
});
```

**Note on `provider.id !== "anonymous"` guard:** without it, signing in anonymously *while already anonymous* (shouldn't normally happen given the client-side guard proposed in Q5, but defensive) would try to "link" the current anon user to itself — harmless but pointless; the guard just skips it cleanly.

### Data that survives automatically once `userId` is preserved

Because every domain table in this app (`meals`, `mealItems` via `meals`, `profiles`) stores `userId: v.id("users")` and the row's primary key never changes, **preserving `userId` means zero data migration is needed** — this is exactly why the "Key Decision" in `.planning/PROJECT.md` to use the Anonymous provider (a real `userId`) instead of local-only storage is correct. No `meals`, `mealItems`, or `profiles` rows need reassignment if linking is done in-place via `createOrUpdateUser`.

### If in-place linking turns out to be unreliable in practice (fallback plan)

If manual QA of the above pattern reveals it doesn't hold (e.g. some Convex client version detaches the token between step 1 and 2, or a future library version changes this), the fallback is explicit reassignment, keyed by `userId`:

| Table | Reassignment needed |
|---|---|
| `profiles` | `withIndex("byUserId", ...)` → `ctx.db.patch(profileId, { userId: newUserId })` |
| `meals` | `withIndex("byUserId", ...)` → patch each `userId` |
| `mealItems` | Not keyed by `userId` directly (keyed by `mealId`) — no patch needed, they follow their parent `meals` row automatically |
| `authAccounts` / `authSessions` for the old anonymous user | Delete (mirror `convex/users/deleteUser.ts` logic) once data is reassigned, to avoid orphaned auth rows |

This would run as a mutation triggered right after the OAuth `signIn` call resolves client-side, using the **old** anonymous `userId` (captured before calling `signIn`) and the **new** `userId` (`getAuthUserId(ctx)` after sign-in resolves). This is strictly worse than in-place linking (more code, more failure modes, a window where data briefly belongs to neither user) — treat it as a last resort, not the plan of record.

---

## 4. Session lifetime, persistence, reinstall/token-loss behavior

Traced directly from source (`node_modules/@convex-dev/auth/src/server/implementation/{sessions,refreshTokens,tokens}.ts`):

| Token | Default lifetime | Config override |
|---|---|---|
| JWT (access token) | **1 hour** (`DEFAULT_JWT_DURATION_MS`) | `config.jwt.durationMs` |
| Refresh token ("inactive duration" — resets on each use) | **30 days** (`DEFAULT_SESSION_INACTIVE_DURATION_MS`) | `config.session.inactiveDurationMs` or env `AUTH_SESSION_INACTIVE_DURATION_MS` |
| Session total duration (absolute cap from creation, regardless of activity) | **30 days** (`DEFAULT_SESSION_TOTAL_DURATION_MS`) | `config.session.totalDurationMs` or env `AUTH_SESSION_TOTAL_DURATION_MS` |
| Refresh token reuse window (grace period for retrying a failed refresh) | 10 seconds | not configurable |

None of these are currently overridden in this app's `convex/auth.ts`/`convex/auth.config.ts`, so all defaults apply. **Practical effect: a guest who opens the app at least once every 30 days keeps a valid session indefinitely** (each refresh resets the 30-day inactivity clock, though the absolute 30-day cap from session *creation* also applies — after 30 days from sign-in, even an active user must re-establish a session, which for the Anonymous provider just means... a new anonymous sign-in and a new, empty guest). **This 30-day hard cap is a real risk for a guest-heavy product** — a returning guest after a month of inactivity gets a *fresh* anonymous account, silently losing their old one's data, with no error surfaced. Recommend explicitly setting a longer `totalDurationMs` (e.g. 180 days) in `convex/auth.ts` for this app, given the guest flow is meant to be indefinite until the user chooses to link.

**Reinstall / token loss:** Tokens persist via `expo-secure-store` (`components/RootLayoutProvider.tsx`, `secureStorage` object passed to `ConvexAuthProvider`).
- **Android:** `expo-secure-store` backs onto `EncryptedSharedPreferences`, which lives in the app's private data directory and is deleted on uninstall. **Guest data is unrecoverable after uninstall on Android** — a reinstall always starts a brand-new anonymous session (once the client-side auto-guest-signin from Q5 is added), leaving the old `users`/`profiles`/`meals` rows in Convex permanently orphaned.
- **iOS:** `expo-secure-store` backs onto the iOS Keychain, which by default **survives app deletion** (Keychain items are not tied to the app sandbox the way `UserDefaults`/files are) unless the device itself is erased. So on iOS, a guest who deletes and reinstalls the app may actually recover their session automatically — but this is **not guaranteed app-facing behavior**; it depends on OS defaults `expo-secure-store` doesn't explicitly override (no `kSecAttrAccessible*` customization visible in this app's code), and is a de facto side effect, not a designed guarantee. Do not build product copy or QA scripts that assume this.

**Mitigations to recommend for the roadmap:**
1. Raise `totalDurationMs`/`inactiveDurationMs` well past 30 days (e.g. 180 days) in `convex/auth.ts` so the "30-day silent guest reset" isn't the default failure mode.
2. Make linking (Q3) as low-friction and as early-prompted as possible — e.g. a persistent (dismissible) banner or a nudge after the first successful meal analysis — since uninstall/reinstall on Android is an unrecoverable data-loss event with no mitigation possible from the app side.
3. Do not rely on iOS Keychain persistence-after-uninstall as a safety net; treat both platforms as "guest data is gone on reinstall" for planning purposes.
4. There is no server-side notification when a guest's session silently expires after 30 days inactivity — client should treat "signed in as a *new* anonymous user with no profile/meals" as a distinguishable state if this matters for support/analytics (e.g. log an event, don't just silently onboard them again).

Sources: `node_modules/@convex-dev/auth/src/server/implementation/{sessions,refreshTokens,tokens}.ts`, `docs/pages/advanced.mdx` ("Session validity", "Session document lifecycle" sections, fetched from github.com/get-convex/convex-auth).

---

## 5. Client-side changes

### Where the guest sign-in call should live

**`context/AuthContext.tsx`** — the existing central auth abstraction — not `app/_layout.tsx`. This keeps `RootNavigator`'s `<Stack.Protected guard={isAuthenticated}>` completely untouched: once the anonymous sign-in resolves, Convex's real `isAuthenticated` flips to `true` and the existing gate logic just works, no new guard needed.

### Exact change to `context/AuthContext.tsx`

```tsx
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  useAuthActions,
  type ConvexAuthActionsContext,
} from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import logError from "@/lib/utils/logError";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: ConvexAuthActionsContext["signIn"];
  signOut: ConvexAuthActionsContext["signOut"];
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const { isLoading: isConvexLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const [guestSignInAttempted, setGuestSignInAttempted] = useState(false);
  const guestSignInInFlight = useRef(false);

  useEffect(() => {
    if (isConvexLoading || isAuthenticated) return;
    if (guestSignInInFlight.current) return;
    guestSignInInFlight.current = true;
    signIn("anonymous")
      .catch((error: unknown) => {
        logError("Anonymous sign-in failed", error);
      })
      .finally(() => {
        setGuestSignInAttempted(true);
      });
  }, [isConvexLoading, isAuthenticated, signIn]);

  // Keep the app in a "loading" state (splash screen stays up, see
  // SplashScreenController) until Convex resolves a stored token AND,
  // if there wasn't one, until the guest bootstrap attempt has finished.
  const isLoading =
    isConvexLoading || (!isAuthenticated && !guestSignInAttempted);

  const value: AuthContextValue = { isAuthenticated, isLoading, signIn, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthContextProvider");
  }
  return context;
}
```

**Why this avoids a flash of the auth screen / race with splash:** `components/SplashScreenController.tsx` already gates the entire app tree on `isAuthLoading` from `useAuthContext()` — it renders `null` (keeping the native splash screen visible via `SplashScreen.hideAsync()` not yet called) until `isReady = !isAuthLoading && fontsLoaded`. Since `RootLayoutProvider` wraps `<SplashScreenController>` around `{children}` (which is `app/_layout.tsx`'s `RootNavigator`), **`RootNavigator` never mounts/renders until the combined `isLoading` above is false.** With the change above, `isLoading` stays `true` for the entire guest-bootstrap window, so `<Stack.Protected guard={isAuthenticated}>`/`guard={!isAuthenticated}` never get evaluated with a stale `isAuthenticated: false` — there is no intermediate frame where `/auth` is reachable. No changes needed to `app/_layout.tsx` or `app/app/_layout.tsx` — both already correctly consume `isLoading`/`isAuthenticated` from `useAuthContext()`.

**Failure fallback:** if `signIn("anonymous")` throws (e.g. offline on first launch), `guestSignInAttempted` still flips to `true`, `isLoading` becomes `false`, and — since `isAuthenticated` is still `false` — the existing `/auth` stack (with its current Google/Apple buttons) becomes reachable as a safety net rather than hanging on the splash screen forever. This is a deliberate, acceptable degradation; no additional UI is required for this milestone, but consider a retry affordance later.

**React Strict Mode / double-invoke safety:** the `guestSignInInFlight` ref (not state) prevents a double `signIn("anonymous")` call if the effect fires twice before the first call resolves (dev Strict Mode, or any other double-render race) — the Anonymous provider has no idempotency of its own (it calls `crypto.randomUUID()` for a fresh account every invocation, per `Anonymous.ts` source), so two concurrent calls would genuinely create two separate guest users if unguarded.

### Things intentionally left unchanged
- `app/_layout.tsx` — no changes.
- `app/app/_layout.tsx` — no changes (already correctly derives `isLoading`/redirect from `useAuthContext()`/`useProfileStatus()`).
- `app/auth/*` screens — kept as-is; they become the entry point for the *next* milestone's "upgrade your account" flow (a Settings screen can route here even while `isAuthenticated` is already true for a guest, since `<Stack.Protected guard={!isAuthenticated}>` on the `auth` group would need loosening then — flag this as a Q3-adjacent follow-up for the linking milestone, out of scope here since Apple/Google sign-in itself is deferred).

---

## 6. Risks

### Abuse / AI cost (HIGH severity, specific to this app)

`convex/rateLimit.ts` keys the 50/day AI budget by `getAuthUserId(ctx) ?? "anonymous"`. **A real signed-in-anonymously user always has a real `userId`** (the `?? "anonymous"` fallback is dead code for this flow — it only matters for the theoretical case of an unauthenticated call, which the AI actions already reject earlier via their own `getAuthUserId` checks). This means **every anonymous sign-in gets its own fresh, full 50-requests/day budget**, and creating a new anonymous user is a single unauthenticated mutation call with zero verification (per official docs, this is a known, named risk: *"Enabling anonymous users allows any client to write data into your database without authentication, which could be abused by malicious actors"*).

Concretely farmable via:
- Android uninstall/reinstall (secure store cleared → new guest on next launch).
- Explicit "sign out" if ever exposed to a guest (with the Q5 change, signing out an anonymous user just immediately re-triggers a *new* anonymous sign-in on the next render — an even easier farming loop than reinstalling). **Do not expose a "Sign out" affordance for anonymous users in this milestone** — Settings should hide/disable it when `profile` (or a new `isAnonymous` flag surfaced to the client) indicates a guest.
- Scripted `signIn("anonymous")` calls directly against the Convex deployment (no app installation needed at all, since it's just an unauthenticated action call).

**Recommended mitigations for the roadmap (not fully implementable in a research doc, flagging for a phase):**
1. **Lower, separate rate limit for anonymous users.** `authTables.users.isAnonymous` is already queryable — add a second key/limit in `convex/rateLimit.ts` (e.g. 5–10/day, or a low *lifetime* cap before requiring linking) and branch on `(await ctx.db.get(userId))?.isAnonymous`. This doubles as a natural upsell trigger ("Sign in to keep analyzing meals").
2. **CAPTCHA/attestation before allowing anonymous sign-in**, per the official pattern (`profile` callback validating a Cloudflare Turnstile/hCaptcha token passed as `signIn("anonymous", { token })`). Heavier lift (needs a frontend CAPTCHA widget, awkward in a native Expo app — Turnstile/hCaptcha are web-widget-first); more realistically for a native app, consider Apple App Attest / Google Play Integrity, but that's a separate research topic — flag as a candidate phase, don't design it here.
3. Do not treat this as blocking for the guest-mode milestone (PROJECT.md scope is a stable TestFlight build to internal testers, not a public launch) — but the roadmap should explicitly schedule mitigation #1 before any public/App-Store release, since the current 50/day-per-trivially-created-user is a real, currently-shippable cost bleed once anonymous sign-in exists.

### Orphaned user rows (MEDIUM severity)

Every abandoned guest (never links, uninstalls, or hits the 30-day session cap from Q4) leaves a permanent `users` + `profiles` row, plus any `meals`/`mealItems` and **Convex file-storage blobs (meal photos)**, with no expiry. There is currently no `convex/crons.ts` in this repo (confirmed — file does not exist) and no cleanup mutation for stale anonymous users. Storage cost from orphaned meal photos grows unbounded. **Recommend a scheduled cleanup phase** (Convex cron, using `@convex-dev/migrations` which is already installed, or a plain `crons.ts`) that deletes `isAnonymous: true` users (and their `meals`/`mealItems`/storage/`profiles`/`authAccounts`/`authSessions`, mirroring the existing `convex/users/deleteUser.ts` pattern) past some inactivity threshold (e.g. 60–90 days, comfortably past the recommended extended session duration from Q4).

### App Store review implications (LOW-MEDIUM, and net-positive for guest mode itself)

- Adding guest mode itself is **not** an App Store risk — Apple generally favors account-free access to core features (Guideline 5.1.1's spirit; the "Sign in with Apple" requirement under 4.8 is specifically about apps that *force* third-party account creation, which guest mode moves away from).
- However, this does **not** remove the existing, already-flagged obligation: `.planning/codebase/CONCERNS.md` notes the Apple Sign-In button is currently shown but non-functional (`usesAppleSignIn: false`, plugin commented out). Once the *next* milestone restores Google sign-in for real, Guideline 4.8 (offer Sign in with Apple wherever a third-party login is offered) applies in full — this is already correctly captured as a separate, deferred concern in `.planning/PROJECT.md`'s "Key Decisions" and "Out of Scope," not something this research changes.
- No review risk specific to the *linking* mechanism itself has been found in official Apple guidelines research; this is a backend implementation detail invisible to review.

### RevenueCat identity (HIGH severity — the most concrete, concrete risk found)

**Critical finding:** `context/SubscriptionContext.tsx` calls `Purchases.logIn(profile.userId)` — **the Convex `userId` is used directly as the RevenueCat App User ID**, and `convex/profiles/syncSubscriptionStatus.ts` queries RevenueCat via `https://api.revenuecat.com/v1/subscribers/${userId}`, same coupling. There is no separate stable device identifier (no IDFV, no RevenueCat-generated anonymous ID) used anywhere in this flow — identity is 1:1 with Convex `userId`.

**Consequence:** this already works fine for a guest today (RevenueCat will happily `logIn` with the guest's `userId` and track a purchase against it) — **but only if the guest's `userId` never changes.** This is exactly why in-place linking (Q3) is not just a UX nicety but a **monetization-correctness requirement**: if a paying guest later signs in with Google and the linking implementation is not in-place (falls back to the "new userId + data migration" path, or is simply not implemented before this ships), `Purchases.logIn(newUserId)` on the new identity will **not** automatically re-attach the RevenueCat customer record (and its active entitlement) created under the old `userId` — RevenueCat treats an unseen App User ID as a brand-new anonymous-turned-identified customer. The purchase still exists at the App Store/Play Store level and can be recovered via the app's existing `restorePurchases()` (`context/SubscriptionContext.tsx`), but this requires the user to notice and tap "Restore Purchases" manually — a real churn/support-burden risk for a paying customer who appears to have "lost" their subscription.

**Recommendation:** treat "guest → real account keeps the same `userId`" as a hard product requirement before allowing guests to purchase Pro, or at minimum, prominently surface "Restore Purchases" immediately after any account-linking flow as a safety net. `syncSubscriptionStatus` itself needs **no code change** to support guests — it's already `userId`-agnostic — but its correctness downstream depends entirely on Q3's in-place linking actually holding.

---

## 7. `convex-better-auth` migration (TODO.md) — does it handle this better, and is starting with `@convex-dev/auth`'s Anonymous provider now wasted work?

**Recommendation: proceed with `@convex-dev/auth`'s Anonymous provider now, as `.planning/PROJECT.md`'s constraints already state.** This is not just "don't redo work now," it's also true that better-auth doesn't meaningfully solve the hard part better.

Findings (labs.convex.dev/better-auth docs, better-auth.com/docs/plugins/anonymous, both fetched):
- `convex-better-auth`'s anonymous plugin **is supported** ("works out of the box... without any required schema changes").
- BUT its default linking behavior is *worse* for this app's needs, not better: **by default the anonymous user is deleted and a brand-new user record is created** for the real account. Official docs: *"The anonymousUser will be deleted by default."* Preserving data requires the same category of manual work this research already designed for `@convex-dev/auth` — a hook (`onLinkAccount: async ({ anonymousUser, newUser }) => { /* move cart items etc. */ }`) where **you** write the data-transfer logic, plus a `disableDeleteAnonymousUser` flag if you want to keep the anonymous row around instead. There is no built-in "same ID survives" behavior in better-auth's anonymous plugin either — if anything, its idiomatic default (delete + new ID + manual transfer) is a worse starting point than `@convex-dev/auth`'s `createOrUpdateUser` callback, which *can* preserve the same `userId` with zero row reassignment.
- Integration maturity is unclear (no explicit alpha/beta/stable label found), but the presence of migration guides spanning versions 0.8 through 0.12 in the docs indicates ongoing breaking changes — consistent with `.planning/PROJECT.md`'s framing of it as "planned but not started."

**Rework assessment:** the guest-mode UX pattern built in this milestone (silent auto-guest-signin gated on splash, `isAnonymous` flag driving UI like hiding "Sign out," the "prompt to link early" product pattern) is **backend-agnostic** — it survives a future better-auth migration conceptually unchanged. Only the low-level wiring (`convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts`, `context/AuthContext.tsx`'s `useAuthActions`/`useConvexAuth` imports, `convex/schema.ts`'s `authTables` spread) would be rewritten — and **all of that gets rewritten regardless of whether guest mode exists**, since a better-auth migration is a full auth-layer replacement by definition. Choosing to build guest mode on `@convex-dev/auth` now adds no incremental rework attributable to the choice itself.

---

## Sources

- `node_modules/@convex-dev/auth` v0.0.90 source (installed in this repo) — `src/providers/Anonymous.ts`, `src/server/implementation/{users,signIn,sessions,refreshTokens,tokens,types}.ts`, `src/react/client.tsx` — HIGH confidence (ground truth for the exact installed version).
- [Anonymous Users — Convex Auth docs](https://labs.convex.dev/auth/config/anonymous) (fetched via raw GitHub source, `get-convex/convex-auth/docs/pages/config/anonymous.mdx`) — HIGH confidence.
- [Advanced: Details — Convex Auth docs](https://labs.convex.dev/auth/advanced) (raw source `docs/pages/advanced.mdx`) — HIGH confidence for account-linking/session-lifetime documentation.
- [Authorization — Convex Auth docs](https://labs.convex.dev/auth/authz) — HIGH confidence.
- [`get-convex/convex-auth` test suite, `test/convex/anonymous.test.ts`](https://github.com/get-convex/convex-auth/blob/main/test/convex/anonymous.test.ts) — shows the anonymous-upgrade scenario is `test.todo` (unimplemented by maintainers) — MEDIUM-HIGH confidence signal that the pattern is untested upstream, treat as needing your own QA.
- [Transfer Anonymous to OAuth user · Issue #231 · get-convex/convex-auth](https://github.com/get-convex/convex-auth/issues/231) — open, unanswered as of this research — confirms no official recommended pattern exists yet.
- [Anonymous plugin — better-auth.com](https://www.better-auth.com/docs/plugins/anonymous) and [Supported Plugins — Convex + Better Auth](https://labs.convex.dev/better-auth/supported-plugins) — MEDIUM confidence (WebFetch summaries, not full raw source, but consistent across both pages).
- This repo: `convex/auth.ts`, `convex/schema.ts`, `convex/rateLimit.ts`, `convex/users/deleteUser.ts`, `convex/profiles/syncSubscriptionStatus.ts`, `context/AuthContext.tsx`, `context/SubscriptionContext.tsx`, `components/RootLayoutProvider.tsx`, `components/SplashScreenController.tsx`, `components/auth/SignInButtons.tsx`, `app/_layout.tsx`, `app/app/_layout.tsx` — HIGH confidence (direct read).
