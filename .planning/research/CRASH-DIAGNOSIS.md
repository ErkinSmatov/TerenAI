# Crash Diagnosis Research: TestFlight Instant-Launch Crash

**Project:** TerenAI (`/Users/smatov/GitLab/CalYo`)
**Researched:** 2026-08-05
**Mode:** Feasibility / diagnostic investigation (not ecosystem survey)
**Overall confidence:** HIGH on hypothesis ranking (one cause found directly in code), MEDIUM-HIGH on tooling/process guidance (verified against current official docs)

---

## 0. Codebase-Specific Finding (read this first)

While reading the required files for this research, I found what is very likely **the actual bug**, not just a hypothesis. It should be checked/fixed *before* setting up any tooling.

`components/RootLayoutProvider.tsx:28-33` (this module is imported at the very top of the component tree, before any Provider or ErrorBoundary can mount):

```ts
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL must be defined to initialize ConvexReactClient"
  );
}

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});
```

This is a **module-level throw**, executed during JS bundle evaluation, before React even calls `RootLayout()`. If `EXPO_PUBLIC_CONVEX_URL` is empty/undefined in the bundle that shipped to TestFlight, this throws synchronously and unconditionally — every single time, on every device, on first frame. No error boundary in the tree can catch it because it happens before any component renders. This exactly matches the reported symptom: "crashes immediately on launch," 100% reproducible, works in dev (where `.env.local` is populated by `npm run env:pull`, which is hardcoded to `--environment development` — see below).

Two independent process gaps make this the most probable root cause, not just a theoretical one:

1. **`package.json` has no `env:pull:production` script** — only `"env:pull": "eas env:pull --environment development"`. There is no evidence anyone on the team has ever pulled or inspected the `production` EAS environment's variables locally.
2. **`eas.json`'s `production` build profile has `"environment": "production"`** but nothing in the repo confirms that EAS environment actually has `EXPO_PUBLIC_CONVEX_URL` (or the RevenueCat keys) populated. EAS environments are fully independent buckets — a variable existing in `development` has no bearing on whether it exists in `production` (confirmed via Expo's official docs, see §5).

**Action for the roadmap phase (cheapest possible check, do this first, costs ~1 minute, no build required):**
```bash
eas env:list --environment production
```
or open **expo.dev → project → Environment variables → production** in the dashboard and visually confirm `EXPO_PUBLIC_CONVEX_URL` (and `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`) are present, non-empty, and point at the correct Convex deployment. Also check that `CONVEX_PROD_URL` (a *different*, non-`EXPO_PUBLIC_`-prefixed var also present in `.env.example`) hasn't been confused with `EXPO_PUBLIC_CONVEX_URL` when the production environment was configured — they look similar but only the `EXPO_PUBLIC_` one is ever read by client code (`grep` confirms `CONVEX_PROD_URL` is only referenced in `scripts/importFdcData.ts` / `scripts/syncFoodsData.ts`, never in `app/`, `components/`, or `context/`).

Note by contrast: RevenueCat init in `context/SubscriptionContext.tsx:60-64` is **already defensively guarded** (`if (apiKey) { Purchases.configure(...) }`) — a missing RevenueCat key will *not* crash, it will just silently skip configuration (a real bug, but not the launch-crash). This asymmetry — one env var access throws, the other silently no-ops — is itself worth fixing for consistency, but only the Convex one explains a 100%-reproducible instant crash.

---

## 1. Ranked Hypotheses for "works in dev, crashes instantly in TestFlight"

Ranked by likelihood × cheapness-to-check for this exact codebase and stack (Expo SDK 54.0.21, RN 0.81.5, React 19.1, New Architecture, React Compiler, Reanimated 4.1.3 + worklets 0.5.1, Skia 2.2.12, Expo Router 6.0.14).

### #1 — Missing/empty `EXPO_PUBLIC_*` env var in the `production` EAS environment → module-level throw (HIGH confidence, root cause likely already found in code, see §0)
- **Why #1:** Found directly in source, matches symptom exactly (instant, deterministic, every launch), matches the team's own process gap (no `env:pull:production` script, `eas.json` production profile relies entirely on EAS-hosted vars with no local `.env` fallback checked in).
- **Mechanism:** `EXPO_PUBLIC_*` vars are inlined into the JS bundle **at build time** by Metro, using whichever EAS environment is attached to the build profile (`eas.json` → `build.production.environment: "production"`). If that EAS environment lacks the var, `process.env.EXPO_PUBLIC_CONVEX_URL` is `undefined` in the shipped bundle — permanently, until rebuilt. This is unrelated to whether the variable exists in `development`.
- **How to confirm:** `eas env:list --environment production` (cheapest, no build). If confirmed missing, add it via `eas env:create --environment production` or the dashboard, then rebuild.
- **Source:** [Expo: Environment variables in EAS](https://docs.expo.dev/eas/environment-variables/) — "EXPO_PUBLIC_ variables in your application code will be replaced inline with the corresponding values from your EAS environment", environments (`development`/`preview`/`production`) are independent variable sets keyed by the `environment` field in `eas.json`.

### #2 — Native module present in dev client but missing/misconfigured native config in the production build (MEDIUM-HIGH confidence, one concrete lead in code)
- **Lead found in code:** `app.config.ts:49` has `// "expo-apple-authentication", TODO` — the Expo config plugin for `expo-apple-authentication` is **commented out**, yet the package itself remains a full dependency (`package.json`: `"expo-apple-authentication": "~8.0.7"`) and is actively imported/used at runtime — `components/auth/SignInButtons.tsx:77-95` renders a "Продолжить с Apple" button and calls `signIn("apple", ...)`, unconditionally on `Platform.OS === "ios"`.
- **Why this is a real crash risk, not just a broken button:** Because `ios/` is a **committed, prebuilt native folder** (not managed workflow), the actual native capability/entitlement wiring depends on whatever the config plugin last generated. If the `ios/` folder was regenerated (`npx expo prebuild`) *after* the plugin was commented out, the `Sign in with Apple` entitlement will be stripped from `ios/*.entitlements`, but the JS-level `expo-apple-authentication` native module is still linked (since the npm package is still installed and autolinked by CocoaPods regardless of the Expo plugin). Calling a native module whose backing capability/entitlement isn't present typically throws at the point of use (tapping the button), **not on launch** — so this is more likely to explain "crashes when tapping Apple Sign-In" than "crashes on launch". Still worth checking: if any code path calls an Apple-Authentication-related API eagerly at startup (e.g., `AppleAuthentication.isAvailableAsync()` at the top of a context provider, or auto-restore-session logic that probes Apple credential state on mount), this could fire before user interaction. Grep `components/`, `context/AuthContext.tsx` for `expo-apple-authentication` imports outside the button handler to rule this in/out.
- **General pattern (not specific to this repo, but common in this exact stack):** A JS module that requires a native counterpart (Turbo/Fabric native module) that isn't in the compiled binary throws `TurboModuleRegistry.getEnforcing(...): 'X' could not be found` — this is fatal in release mode. Classic cause: a config plugin was added/removed without re-running `npx expo prebuild` (or without regenerating the committed `ios/`/`android/` folders and reinstalling CocoaPods), so the JS bundle expects a module that the native binary doesn't actually contain, or vice versa (native side has stale Apple Sign In entitlement code but was never an issue since dev client is compiled from current source too — check that dev client and production actually build from the same `ios/` state).
- **How to confirm:** `grep -rn "expo-apple-authentication\|AppleAuthentication" components/ context/ app/` for any call outside a button `onPress` handler. Also diff `ios/TerenAI/TerenAI.entitlements` (or equivalent) against what `expo-apple-authentication`'s plugin would generate, to see whether the entitlement is actually present or already stripped from a stale prebuild.
- **Confidence:** MEDIUM (plausible native-module mismatch mechanism, well-documented pattern) but LOW specifically for "crashes on launch" vs. "crashes on tap" without further code inspection — flagged for the fix phase to verify with a grep, not to assume.

### #3 — Hermes bytecode / minification / dead-code-elimination differences (LOW-MEDIUM confidence, generic risk)
- **Mechanism:** Release builds compile JS to Hermes bytecode with `minifierEnabled` (default true for release) and full DCE; latent bugs like accessing an object property assumed-always-present, relying on `Function.prototype.name`/`toString()` for behavior, or code that behaves differently under `__DEV__ === false` branches (many libraries, including React itself and Reanimated, have separate dev/prod code paths) can surface only in release. This is a broad, hard-to-pin-down category — treat as a fallback hypothesis if #1 and #2 are both ruled out.
- **Specific to this stack:** React Compiler (`experiments.reactCompiler: true`, `babel-plugin-react-compiler ^19.0.0-beta-af1b7da-20250417`) is still a **beta-tagged package version** as of this codebase's lockfile. Compiler-transformed code can behave subtly differently around memoization/effect timing, and beta compiler versions have shipped codegen bugs before. This is a plausible, if less likely, contributor, especially since it's a genuinely new/risky piece of the stack per the team's own `PROJECT.md` framing ("свежий и относительно рискованный стек").
- **How to confirm:** Nearly impossible to confirm without a real crash log/stack trace. This is why §2 (getting the actual crash log) must happen before spending time chasing this hypothesis blind.

### #4 — Reanimated 4 / worklets + New Architecture release-mode issue (MEDIUM confidence, documented pattern exists for this exact combo)
- **Found:** A real, matching GitHub issue — [software-mansion/react-native-reanimated#8235](https://github.com/software-mansion/react-native-reanimated/issues/8235), titled "Crash on first start" — reports the app crashing on initial launch with the error `"Reanimated 4 supports only the React Native New Architecture and web"`, occurring **consistently in release builds on real devices**, intermittently on emulators, and going away on subsequent launches. Reported against RN 0.80.2 / Reanimated 4.0.2 / worklets 0.4.1 with `newArchEnabled=true` — i.e., the same architecture combination this project uses (RN 0.81.5 / Reanimated 4.1.3 / worklets 0.5.1). Root cause per the issue: Reanimated's `NativeReanimatedModule` init-time check for whether New Architecture is active can misfire in release/minified builds even when `newArchEnabled` is correctly set project-wide. As of this research, the issue's fix status is unresolved/unconfirmed upstream (a linked PR #8406 exists but merge status wasn't verifiable from the issue page alone) — treat as an open risk, not a solved-and-patched one; check the installed `react-native-reanimated`/`react-native-worklets` versions against the latest patch releases before ruling this out.
- **Also documented:** Reanimated's own [troubleshooting guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting/) explicitly calls out "Using dev bundle in a release app build is not supported" as a known release-specific failure mode, and warns that the Babel worklets plugin, the `react-native-worklets` runtime package, and the Reanimated JS/native code must all be the exact same minor version or behavior is undefined — worth a version-consistency check (`npm ls react-native-reanimated react-native-worklets`) since this project pins `react-native-worklets` to an exact `0.5.1` (no caret) while `react-native-reanimated` floats on `^4.1.3`, which is a plausible drift vector if a later Reanimated patch shipped that expects a newer worklets minor.
- **How to confirm:** Look for `"Reanimated 4 supports only the React Native New Architecture and web"` or any Reanimated/worklets frame in the symbolicated crash log (§2). If absent, deprioritize this hypothesis.

### #5 — Splash screen / font loading race condition (LOW confidence — code reviewed, looks correctly guarded)
- **Reviewed:** `components/SplashScreenController.tsx` correctly calls `SplashScreen.preventAutoHideAsync()` (module scope, `RootLayoutProvider.tsx:26`) and only calls `SplashScreen.hideAsync()` once `!isAuthLoading && fontsLoaded` — a standard, correct pattern per Expo Router docs. If this were misconfigured, the typical symptom is an **infinite splash screen** (app "hangs," doesn't respond) rather than an instant crash, so this doesn't match the reported symptom. Ruled low-priority unless #1–#4 are all ruled out and the actual observed symptom is "splash screen freezes" rather than "app crashes/closes."
- **Caveat:** If Convex client throws (per #1) before `RootLayoutProvider` even returns JSX, `SplashScreenController` never mounts at all — so what looks like "the app crashes on the splash screen" to a tester is fully consistent with, and likely *is*, hypothesis #1, not a splash-screen-specific bug.

### #6 — RevenueCat SDK initialization with missing API key (LOW confidence — code reviewed, already defensively guarded)
- **Reviewed:** `context/SubscriptionContext.tsx:56-73` — the whole init block is wrapped in `try { ... } catch (e) { console.error(...) } finally { setIsLoading(false) }`, and `Purchases.configure({ apiKey })` is only called `if (apiKey)`. A missing/undefined `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`/`EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY` will **not** throw or crash — it silently skips configuration, leaving `isPro: false` and `isConfigured: false` forever. This is a real product bug (subscriptions silently never work) but does not explain an instant launch crash. Deprioritized for the crash investigation specifically, but flag it for the roadmap as a near-term follow-up once the crash is fixed (same missing-env-var class of problem as #1, just non-fatal instead of fatal).

### Ranking summary (cheapest/most-likely first, for the fix phase to work through in order)
1. **Check `eas env:list --environment production`** for `EXPO_PUBLIC_CONVEX_URL` (and the two RevenueCat keys) — 1 minute, no build, directly matches a throw found in source.
2. **Get the actual crash log** (§2) — even if #1 turns out to be the cause, having the log confirms it in ~10 minutes and rules out everything else at once.
3. **Grep for eager `expo-apple-authentication` calls** outside button handlers — 5 minutes.
4. **Reproduce locally in Release configuration** (§3) with production env vars pulled — proves/disproves #1, #3, #4 simultaneously without waiting for another TestFlight upload (which can take 15-60+ min for Apple processing).
5. Only after 1-4: consider Reanimated/worklets version pinning (#4) or React Compiler beta issues (#3) as deeper rabbit holes.

---

## 2. Getting the Actual Crash Log for a TestFlight Build (No Crash Reporting SDK)

Critical distinction the roadmap phase must understand up front:

> **An uncaught JS exception in a React Native *release* build is fatal and crashes the native process** (it does not show a silent red screen the way dev builds do). React Native's default `ErrorUtils` global handler treats unhandled JS exceptions in production as fatal and invokes native-side fatal error handling (`RCTFatal` on iOS), which **terminates the app and generates a real OS-level crash report**. This means hypothesis #1 (the module-level `throw`) *will* show up in Xcode Organizer / device crash logs — you do not need a JS-specific crash reporter to see that this particular exception happened, though the report will primarily show native/JS-engine frames (Hermes bytecode addresses, `RCTFatalException`) rather than a clean JS stack trace with the string `"EXPO_PUBLIC_CONVEX_URL must be defined..."` unless you symbolicate with the exact `main.jsbundle`'s companion source map. (MEDIUM confidence — this is well-established RN behavior across versions, but bridgeless/New-Architecture-specific edge cases in exactly how the fatal path routes were not independently re-verified for RN 0.81 in this research pass.)

### Option A — Xcode Organizer (best first stop, works even for internal TestFlight testers without dSYM upload if the crash happens on a device you can retrieve logs from)

1. Open **Xcode → Window → Organizer** (or `Cmd+Shift+2`).
2. Select the app in the left sidebar, then the **Crashes** tab.
3. Crash reports appear here automatically for:
   - Any device that has crash-log sharing enabled and has synced with the Mac running Xcode (works even without a TestFlight distribution, via Analytics).
   - TestFlight testers who opted in to share analytics with the developer — App Store Connect aggregates and symbolicates these automatically (usually within 24-48h) **if a matching dSYM was uploaded** for that build.
4. Double-click a crash to see the symbolicated stack trace (native frames guaranteed; JS frames only if Hermes source maps are available — see Option C).

**dSYM caveat:** Hermes bytecode builds still produce dSYMs for the *native* iOS binary (crash frames inside `libhermes`, RN core, native modules) — these usually auto-upload with `eas build` and are visible in App Store Connect → your app → TestFlight → Builds → (build) → "View dSYMs," or can be manually downloaded/re-uploaded via Xcode Organizer's "Download dSYM" / drag-and-drop. Without the matching dSYM, Organizer/App Store Connect will show an **unsymbolicated** report (raw addresses only) — still useful (thread that crashed, signal type, whether it's `EXC_BREAKPOINT`/`EXC_CRASH`/etc.), but much harder to read.

### Option B — Console.app (best for immediate, non-Apple-processed logs from a physical device you control)

1. Connect the tester's/your iPhone to a Mac via cable (or same-network Wi-Fi debugging if previously paired).
2. Open **Console.app** (Applications → Utilities), select the device under "Devices" in the sidebar.
3. Filter for the app's process name (`TerenAI`) or bundle ID (`com.codetau.terenai`), start streaming, then launch the app on the device.
4. The crash (and any `os_log`/`NSLog` output preceding it) streams live — this is the fastest path if you have physical access to a device that reproduces the crash, since it doesn't wait for Apple's processing pipeline (which can take hours for Organizer-fetched TestFlight crash reports).
5. Alternative: **Xcode → Window → Devices and Simulators → select device → "View Device Logs"** — shows the same underlying `.ips`/`.crash` files, exportable directly.

### Option C — Manually symbolicating a `.ips` crash report

If you have a raw `.ips` file (from Console.app, AirDropped from a tester via Settings → Privacy → Analytics & Improvements → Analytics Data, or downloaded from App Store Connect) but Xcode isn't auto-symbolicating:

1. Ensure the dSYM for the exact build number is on disk somewhere Spotlight indexes it (Xcode's drag-and-drop symbolication in Organizer relies on Spotlight search — `mdfind "com_apple_xcode_dsym_uuids == <UUID>"` can confirm indexing).
2. For **native** frames: drag the `.ips` onto Xcode Organizer, or use `symbolicatecrash` (bundled with Xcode's `usr/bin`) / the `atos` command against the matching dSYM UUID (visible via `dwarfdump --uuid path/to/App.dSYM`).
3. For **JS/Hermes** frames specifically (this is the part generic iOS symbolication does *not* handle): Hermes crashes need the **Hermes bytecode source map** for that exact build, and Metro's/React Native's `hermes-parser`/`metro-symbolicate` tooling (`npx react-native symbolicate-android`/iOS-side `metro-symbolicate` used via `npx react-native/scripts/*.js`, or the newer `npx expo-symbolicate`-style helpers bundled in current Expo/RN toolchains) to map bytecode addresses back to your original TS/JS source. **EAS Build stores these source maps automatically for builds it produces** (retrievable via `eas build:view <build-id>` artifacts) — this is one of the few pieces of free JS-stack visibility available *without* a crash reporting SDK, but it's manual and slow per-incident, which is the core argument for installing Sentry (§4).

### What you get vs. don't get, without a crash-reporting SDK

| Signal | Available without SDK? | Notes |
|---|---|---|
| That a crash happened, on which build/OS/device | Yes | Organizer, Console.app, App Store Connect |
| Native/OS-level stack (which thread, signal type) | Yes | Always symbolicatable with dSYM |
| JS-level stack trace with your source file/line | Only manually, per-incident | Requires the matching Hermes source map + `metro-symbolicate`; no automatic dashboard, no breadcrumbs, no user/session context, no aggregation across users |
| Custom context (which screen, which user, network state, breadcrumbs leading up to crash) | No | This is exactly what Sentry/Bugsnag add — not obtainable at all from OS-level tooling |
| Aggregation across multiple testers ("47 users hit this crash") | No | App Store Connect does group *native* crashes by signature, but not JS-level errors distinctly, and not with source-level breadcrumbs |

**Practical recommendation for this phase:** Given the module-level-throw hypothesis (#1) is strong and specific, it's faster to (a) check `eas env:list --environment production` and (b) reproduce locally via `expo run:ios --configuration Release` with production env vars pulled (§3) than to wait on Apple's crash-report pipeline. Reserve Xcode Organizer/Console.app for confirming *after* a fix candidate is deployed, or if local reproduction fails to reproduce the crash (which would rule out #1 and point toward something environment-specific to the App Store binary itself, e.g. code signing/provisioning, or TestFlight's export-compliance gate).

---

## 3. Fastest Ways to Reproduce a Production Crash Locally

| Method | Command | Uses production EAS env vars? | Native code identical to TestFlight build? | Speed | Best for |
|---|---|---|---|---|---|
| **A. `eas build --profile production --local`** | `eas build --platform ios --profile production --local` | **Yes for plaintext/sensitive-visibility vars** (fetched from EAS servers same as cloud build) — **No for "Secret"-visibility vars**, which are explicitly unsupported locally and must be set in your own shell env as a workaround. Check the visibility level of `EXPO_PUBLIC_CONVEX_URL`/RevenueCat keys in the EAS dashboard. | Yes — same build pipeline as cloud EAS Build, just executed on your Mac | Slowest of the three (full native compile, ~10-20+ min) | Highest-fidelity reproduction; closest thing to "build exactly what TestFlight built," useful once you suspect it's env-var- or native-config-related and want a true apples-to-apples check before re-submitting to TestFlight |
| **B. Xcode Release scheme on a physical device** | Open `ios/TerenAI.xcworkspace` in Xcode, select the "Release" build configuration/scheme, plug in a real iPhone, Run | Only if `.env`/`.env.local` on disk has the values, or you manually export them into the Xcode scheme's environment — Xcode itself does **not** talk to EAS environments at all | Yes, if `ios/` reflects the current committed native config (it does, since it's a prebuild-committed repo) — but you must ensure CocoaPods (`pod install`) and any config-plugin-generated native files are up to date | Fast iteration (Xcode incremental builds), but manual env var wiring | Debugging with breakpoints/LLDB attached live — the only option in this table that lets you *step through* a release-mode crash interactively |
| **C. `npx expo run:ios --configuration Release`** | `APP_VARIANT=production npx expo run:ios --configuration Release` (this repo's existing `ios` script hardcodes `APP_VARIANT=development`, so you'd need a variant) | **No, unless you first run `eas env:pull --environment production` to overwrite `.env.local`** — by default this repo's only `env:pull` script targets `development`, so running this as-is reproduces with **dev Convex URL**, not production | Runs a fresh `expo prebuild`-equivalent + native build from current source — effectively same native output as A/B if `ios/` is current | Fastest of the three for iterative debugging (Metro fast refresh available, no waiting on EAS queue) | **Best first step to isolate whether the crash is "release-mode-general" (Hermes/minification/Reanimated release-path bugs, §1 hypotheses #3/#4) vs. "production-env-specific" (§1 hypothesis #1)** — run it once with dev env vars (fast, rules in/out #3/#4) and once after `eas env:pull --environment production` (rules in/out #1) |

**Recommended sequence for the fix phase:**
1. `eas env:list --environment production` (§0/§1, no build).
2. `eas env:pull --environment production --path .env.production.local` then `APP_VARIANT=production npx expo run:ios --configuration Release` on a physical device — fastest way to get a real Release-mode launch with real production env vars and a debugger attached. If it crashes, you have Xcode's console + LLDB right there showing the exact JS exception message (Metro/Hermes still prints JS exceptions to the Xcode console even in Release mode when run this way, since you're attached via Xcode rather than a detached TestFlight install).
3. If it does **not** crash locally in Release-with-prod-env-vars, but the actual TestFlight IPA does, suspect something specific to the *archived/exported* build: code signing, a build-time-only EAS environment variable resolution difference, `autoIncrement`/`appVersionSource: "remote"` build-number mismatches, or an EAS-Build-only native step (e.g. a build hook) not exercised by `expo run:ios`. In that case, escalate to method A (`eas build --local`) as the most faithful reproduction.

---

## 4. Recommended Crash/Error Reporting for Expo SDK 54 (current as of this research pass)

### Recommendation: `@sentry/react-native` (current stable, actively maintained). `sentry-expo` is deprecated — do not use it.

- **Status verified:** `sentry-expo` (the old separate package) is deprecated; Sentry's own migration guide (`docs.sentry.io/platforms/react-native/migration/sentry-expo/`) instructs moving to `@sentry/react-native` directly, using its `/expo` entrypoint as both the runtime SDK and the Expo config plugin (the package ships an `app.plugin.js` that proxies to `@sentry/react-native/expo`, so either `"@sentry/react-native"` or `"@sentry/react-native/expo"` works as a plugin path in `app.config.ts`).
- **Latest version observed in research:** `@sentry/react-native` 8.x line (npm shows an 8.21.0-class release as current). Verify exact latest with `npm view @sentry/react-native version` at implementation time rather than trusting this number, since it moves frequently.
- **New Architecture:** No New-Architecture-specific blockers found in current docs; Sentry's RN SDK has supported Fabric/TurboModules/bridgeless for several major versions at this point. No special flags needed beyond normal install.
- **Alternative considered — Bugsnag (`@bugsnag/react-native`):** Still exists and is maintained, but has materially smaller mindshare in the current Expo/RN ecosystem than Sentry, and (per Expo's own official "Using Sentry" guide existing as a first-party doc page, with no equivalent first-party Bugsnag guide) is not the ecosystem-default choice. Recommend Sentry unless the team has an existing organizational Sentry-vs-Bugsnag preference/contract.
- **Alternative considered — Expo's own error reporting (`expo-error-recovery`):** Deprecated since SDK 47, not usable for this purpose. `expo-updates`' built-in error recovery is for handling bad OTA updates specifically, not general crash reporting/telemetry, and is not a substitute.

### Install steps (SDK 54, prebuild/committed-`ios`-and-`android` workflow like this repo)

1. **Install via the Sentry wizard** (handles dependency versions, Metro config, and initialization boilerplate automatically — this is Sentry's/Expo's own documented recommended path over manual install):
   ```bash
   npx @sentry/wizard@latest -i reactNative
   ```
   This detects the Expo project, adds `@sentry/react-native` to `package.json`, wires `Sentry.init(...)` into the app entry, and updates `metro.config.js` for source map generation.

2. **Add the config plugin** in `app.config.ts` (needed because this project uses `app.config.ts`, not `app.json`, and has a committed `ios`/`android` — the plugin's native-side changes will apply on the next `npx expo prebuild`):
   ```ts
   plugins: [
     // ...existing plugins
     [
       "@sentry/react-native/expo",
       {
         url: "https://sentry.io/",
         organization: "<org-slug>",
         project: "<project-slug>",
       },
     ],
   ],
   ```
   Because `ios/`/`android/` are committed rather than generated fresh each build, **run `npx expo prebuild --clean` after adding the plugin** (or manually verify the plugin's native changes — e.g. Sentry's Xcode build phase for dSYM/source-map upload — actually land in the committed `ios/` project) so EAS Build's native compile actually includes Sentry's native crash-capture layer, not just the JS SDK.

3. **Add `SENTRY_AUTH_TOKEN` as an EAS Environment Variable** (visibility: "Sensitive" is sufficient, doesn't need to be "Secret" since it's build-time-only, per Sentry's docs) for the `production` (and ideally `development`) EAS environments, so source maps upload automatically during `eas build`:
   ```bash
   eas env:create --environment production --name SENTRY_AUTH_TOKEN --value <token> --visibility sensitive
   ```

4. **Sourcemap upload for EAS builds** happens automatically once the config plugin is installed and `SENTRY_AUTH_TOKEN` is present in the build environment — no separate manual step for `eas build`. For **EAS Update** (OTA) specifically, note that a *separate* manual step is required after each `eas update`: `npx sentry-expo-upload-sourcemaps dist` (naming may have shifted to a `@sentry/react-native`-native equivalent CLI command in current versions — verify exact command name against current Sentry Expo docs at implementation time, since this was the legacy `sentry-expo` package's command and current docs should be re-checked for the `@sentry/react-native` era name). This project's `eas.json` shows no `channel`/update config currently, so this likely doesn't apply yet, but flag it if EAS Update is added later.

5. **Route the existing `logError` helper through Sentry** — this is a small, low-risk, high-value change (`lib/utils/logError.ts`):
   ```ts
   import * as Sentry from "@sentry/react-native";

   export default function logError(message: string, error: unknown) {
     console.error(
       message,
       error instanceof Error ? error.message : "Unknown error"
     );
     Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
       extra: { message },
     });
   }
   ```
   This is a single change point since (per `CONCERNS.md`) all error handling already funnels through this one helper across `convex/meals/updateMeal.ts`, `convex/meals/getMeal.ts`, `context/SubscriptionContext.tsx`, etc. — no call-site changes needed elsewhere.

6. **Catch the exact class of bug found in §0 going forward:** Sentry's RN SDK installs a global JS error handler (`Sentry.init` wires into `ErrorUtils.setGlobalHandler`) that reports fatal/unhandled JS exceptions automatically, *and* wraps native crash reporting (via its bundled `sentry-cocoa`/`sentry-android` native layers) — so once installed, a repeat of the exact `EXPO_PUBLIC_CONVEX_URL` throw (or any future module-level throw) would show up in the Sentry dashboard with a full JS stack trace, release/build-number tagging, and device context, without needing Xcode Organizer at all. This directly satisfies the milestone requirement "Есть работающая диагностика продакшн-крашей" (`PROJECT.md`).

7. **Note on module-level throws specifically:** Because the crash in §0 happens *before* `Sentry.init()` can possibly run (it's even earlier than `RootLayoutProvider`'s own module scope, at the very top of the require graph if Convex client init is imported early), **installing Sentry does not guarantee this specific crash gets captured** unless `Sentry.init()` is called even earlier than the Convex client construction (e.g., at the very top of `index.ts`, before `expo-router/entry` is imported) — Sentry's global native crash handlers (installed by the native SDK at process start, before any JS runs) *will* still catch this as a native-level "fatal JS exception" crash regardless of JS init order, since the native crash handler layer is independent of `Sentry.init()` JS-side timing for genuinely fatal crashes. Still, best practice is to keep `Sentry.init()` as the very first statement executed, ahead of any other module-level side effects — worth restructuring `index.ts`/`RootLayoutProvider.tsx`'s top-level env-var check into a function called from inside a component (or at minimum below `Sentry.init()`) rather than unconditionally at module-evaluation time, both for Sentry-capture reliability and general good practice (module-level throws are inherently harder to guard/report than throws inside a render/effect).

---

## 5. Summary / Roadmap Implications

**Most likely root cause (check first, ~1 minute):** `EXPO_PUBLIC_CONVEX_URL` (or another `EXPO_PUBLIC_*` var read at module scope) missing from the EAS `production` environment, triggering the unconditional `throw` in `components/RootLayoutProvider.tsx:28-33` before any UI renders. The team's `env:pull` script only ever targets `development`, so this gap has likely never been directly observed locally.

**Suggested phase structure for "diagnose and fix the TestFlight crash":**
1. **Verify env vars** — `eas env:list --environment production`; fix any gaps; this alone may resolve the crash.
2. **Local Release reproduction** — `eas env:pull --environment production` + `APP_VARIANT=production npx expo run:ios --configuration Release` on a physical device attached to Xcode, to get a live JS exception message/stack without waiting on TestFlight/Apple's crash pipeline.
3. **Install `@sentry/react-native`** (not `sentry-expo`) regardless of whether step 1 fixes it — this satisfies the milestone's explicit observability requirement and de-risks the *next* production issue, not just this one. Route `lib/utils/logError.ts` through `Sentry.captureException`.
4. **If still crashing after step 1**, escalate through Xcode Organizer / Console.app device logs (§2) and consider the native-module-mismatch hypothesis (`expo-apple-authentication` plugin commented out but package/usage still present — §1 #2) and Reanimated/New-Architecture release-mode issue (§1 #4) in that order.
5. Defer the RevenueCat-silent-failure bug (§1 #6) to a fast-follow fix — real bug, not the launch crash, but same root category (missing `EXPO_PUBLIC_*` prod var) and worth fixing in the same pass once env vars are being audited anyway.

**Confidence assessment:**

| Area | Confidence | Reason |
|---|---|---|
| Root-cause hypothesis (#1, env var throw) | HIGH | Found directly in source code, not inferred; matches symptom and process gap exactly |
| EAS env var mechanics | HIGH | Verified against current official Expo docs (`docs.expo.dev/eas/environment-variables/`) |
| Xcode Organizer / Console.app / symbolication workflow | MEDIUM-HIGH | Verified against Apple's official docs and current community guides; exact behavior of RN's fatal-JS-exception-to-native-crash path was corroborated by multiple community/GitHub sources but not independently re-derived from RN 0.81 source in this pass |
| Reanimated 4 / New Architecture release crash pattern | MEDIUM | Backed by a specific, matching GitHub issue (#8235) on the same architecture combo, but upstream fix status was not fully confirmed |
| Sentry install steps for SDK 54 | MEDIUM-HIGH | Core install path (wizard, config plugin, EAS sourcemap auto-upload) verified via Expo's and Sentry's official docs; exact current CLI command names/version numbers should be re-verified at implementation time since these move frequently |
| `expo-apple-authentication` as launch-crash cause | LOW-MEDIUM | Real config gap found in code, but mechanism more plausibly explains a tap-time crash than a launch-time crash; flagged for verification via grep, not assumed |

**Gaps / things to verify during implementation (not resolvable from research alone):**
- Actual current EAS `production` environment variable values — requires repo/EAS dashboard access this research pass didn't have (no `gh`/`eas` CLI auth available in this environment).
- Whether `Sentry.init()` timing relative to `RootLayoutProvider.tsx`'s module-level Convex client construction would actually capture this specific class of throw — recommend restructuring the throw into a function/component-level check regardless, both for Sentry compatibility and general robustness (fail with a visible error screen instead of an unrecoverable module-load crash).
- Exact current `npx sentry-expo-upload-sourcemaps`-equivalent command name for `@sentry/react-native` (only relevant if/when EAS Update/OTA is adopted — not currently configured in this repo's `eas.json`).

## Sources

- [Expo: Environment variables in EAS](https://docs.expo.dev/eas/environment-variables/)
- [Expo: Using Environment variables in EAS](https://docs.expo.dev/eas/environment-variables/usage/)
- [Expo: Environment variables (general guide)](https://docs.expo.dev/guides/environment-variables/)
- [Expo: Run EAS Build locally with local flag](https://docs.expo.dev/build-reference/local-builds/)
- [Expo: Using Sentry](https://docs.expo.dev/guides/using-sentry/)
- [Sentry: Migrate from sentry-expo](https://docs.sentry.io/platforms/react-native/migration/sentry-expo/)
- [Sentry: Expo platform docs](https://docs.sentry.io/platforms/react-native/guides/expo/)
- [Sentry: EAS Build hooks](https://docs.sentry.io/platforms/react-native/manual-setup/expo/eas-build-hooks)
- [react-native-reanimated troubleshooting guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting/)
- [react-native-reanimated#8235 — Crash on first start (New Architecture, release builds)](https://github.com/software-mansion/react-native-reanimated/issues/8235)
- [react-native-reanimated migration guide 3.x → 4.x](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/)
- [Apple: Acquiring crash reports and diagnostic logs](https://developer.apple.com/documentation/xcode/acquiring-crash-reports-and-diagnostic-logs)
- [Apple: Diagnosing issues using crash reports and device logs](https://developer.apple.com/documentation/xcode/diagnosing-issues-using-crash-reports-and-device-logs)
- [SwiftLee: Symbolicate crash logs with Xcode](https://www.avanderlee.com/xcode/symbolicate-crash-logs-reports/)
- [expo-error-recovery npm (deprecated status)](https://www.npmjs.com/package/expo-error-recovery)
- Codebase (read directly, primary evidence): `components/RootLayoutProvider.tsx`, `context/SubscriptionContext.tsx`, `components/SplashScreenController.tsx`, `app.config.ts`, `eas.json`, `package.json`, `.env.example`, `app/_layout.tsx`, `.planning/PROJECT.md`, `.planning/codebase/STACK.md`, `.planning/codebase/CONCERNS.md`
