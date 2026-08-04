# External Integrations

**Analysis Date:** 2026-08-04

## APIs & External Services

**AI / LLM Providers:**
- OpenRouter - Primary LLM gateway for meal-analysis chat models (currently routed to `x-ai/grok-4.1-fast`)
  - SDK/Client: `@openrouter/ai-sdk-provider`, instantiated in `convex/ai.ts` via `createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })`
  - Auth: `OPENROUTER_API_KEY` (Convex env var)
  - Used by: `convex/meals/analyze/analyzeMealConfig.ts` (`imageProcessingModel`, `candidateSelectionModel`, `namingModel`), consumed via the Vercel AI SDK's `generateObject`/`generateText` in `convex/meals/analyze/detectMealItems.ts`, `detectMealItemsFromText.ts`, `selectCandidates.ts`, `nameMeal.ts`, `correctMealItems.ts`, `translateFood.ts`

- Google Generative AI (Gemini) - Text embeddings for food matching/search
  - SDK/Client: `@ai-sdk/google` (`google.textEmbeddingModel("gemini-embedding-001")`), plus raw `@google/generative-ai` dependency
  - Auth: `GOOGLE_GENERATIVE_AI_API_KEY` (Convex env var)
  - Used by: `convex/meals/analyze/analyzeMealConfig.ts` (`embeddingsModel`), `convex/utils/backfillFoodEmbeddings.ts`, food candidate selection (`convex/meals/analyze/selectCandidates.ts`) against the `foods.byEmbedding` vector index (`convex/tables/foods.ts`)

**Nutrition Data:**
- USDA FoodData Central (FDC) - Bulk offline import of foundation/legacy/survey food nutrition data
  - Ingested via one-off script `scripts/importFdcData.ts` (parses local JSONL/JSON dump with `stream-json`, validates with `zod`, maps to Convex `foods` table via `lib/fdc/fdcExtractMacros.ts` / `lib/fdc/fdcExtractNutrients.ts`)
  - Synced to Convex via `scripts/syncFoodsData.ts` → calls `api.foods.ingestFoods` action, protected by shared-secret token
  - No live runtime API call — data is a periodic offline batch import, not a request-time integration

- Open Food Facts - Live barcode-lookup for packaged products
  - Client: `lib/off/fetchProduct.ts`, plain `fetch` against `https://world.openfoodfacts.net/api/v2/product/{barcode}`
  - Auth: None (public API); request includes a custom `User-Agent` header built from app name/version/`EXPO_PUBLIC_SUPPORT_EMAIL`
  - Used by: `convex/meals/analyze/analyzeMealBarcode.ts` (barcode-scan meal logging flow)

**Transactional Email:**
- Resend - Sends one-time-passcode (OTP) sign-in emails
  - SDK/Client: `resend` npm package, wrapped in `@convex-dev/auth`'s `Email` provider in `convex/ResendOTP.ts`
  - Auth: `AUTH_RESEND_KEY` (Convex env var)
  - Sender address hardcoded: `TerenAI <sign-in@terenaiapp.com>`
  - 4-digit numeric OTP, 15-minute expiry, generated with `@oslojs/crypto` `generateRandomString`

**Subscriptions / Payments:**
- RevenueCat - In-app purchase / subscription management (App Store + Play Store)
  - Client SDK (mobile): `react-native-purchases`, `react-native-purchases-ui`, configured in `context/SubscriptionContext.tsx` with platform-specific keys (`EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` / `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY`)
  - Server-side verification: `convex/profiles/syncSubscriptionStatus.ts` calls `GET https://api.revenuecat.com/v1/subscribers/{userId}` with `REVENUECAT_SECRET_KEY` bearer token to confirm entitlement (`pro`, defined in `config/revenueCatConfig.ts`) and writes `isPro` to the user's profile via `internal.profiles.updateProStatus`
  - RevenueCat `userId` is set to the Convex Auth `userId` via `Purchases.logIn(profile.userId)`, linking the two identity systems

## Data Storage

**Databases:**
- Convex (document database + reactive query engine) - sole application datastore
  - Connection: `EXPO_PUBLIC_CONVEX_URL` (client, `components/RootLayoutProvider.tsx`), `CONVEX_DEPLOYMENT`/`CONVEX_PROD_URL` (deploy/scripts)
  - Client: `convex/react` (`ConvexReactClient`, `useQuery`/`useAction`/`useMutation`), `convex/browser` (`ConvexHttpClient` for scripts)
  - Schema: `convex/schema.ts` composing `authTables` (from `@convex-dev/auth`) plus app tables defined in `convex/tables/` (`foods`, `meals`, `mealItems`, `profiles`)
  - Vector search: `foods` table has a `byEmbedding` vector index (`convex/tables/foods.ts`) for AI-driven food candidate matching

**File Storage:**
- Convex file storage - used for meal photo uploads
  - Upload URL generation: `convex/storage/generateUploadUrl.ts`
  - No separate S3/GCS bucket detected

**Caching:**
- None detected (no Redis/Memcached). `react-native-mmkv` provides local on-device key-value storage only.

## Authentication & Identity

**Auth Provider:**
- Convex Auth (`@convex-dev/auth`) - self-hosted auth framework running inside Convex, configured in `convex/auth.ts` and `convex/auth.config.ts`
  - Providers enabled:
    - Google OAuth (`@auth/core/providers/google`) - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
    - Apple Sign-In (`@auth/core/providers/apple`) - `AUTH_APPLE_ID` / `AUTH_APPLE_SECRET`; client-side `expo-apple-authentication` present but currently disabled in `app.config.ts` (`usesAppleSignIn: false`, plugin commented out)
    - Email OTP via Resend (`ResendOTP`, see above)
    - `ConvexCredentials` password provider — special-cased **test-only** login (`config/testingConfig.ts` test email/password) creating/reusing a fixed test user via `convex/testing/getOrCreateTestUser.ts`
  - HTTP routes: `convex/http.ts` mounts `auth.addHttpRoutes(http)` for OAuth callbacks
  - JWT signing: `JWT_PRIVATE_KEY` / `JWKS` env vars; site URL via `SITE_URL` / `CONVEX_SITE_URL`
  - New-user hook: `afterUserCreatedOrUpdated` callback auto-creates a `profiles` row with defaults from `config/profilesConfig.ts`
  - Client integration: `@convex-dev/auth/react`'s `ConvexAuthProvider` in `components/RootLayoutProvider.tsx`, using `expo-secure-store` as the token storage backend on iOS/Android
  - Session/route guarding: `app/_layout.tsx` uses `useAuthContext()` + Expo Router's `Stack.Protected` to gate `app/app` (authenticated) vs `app/auth` (unauthenticated) route groups

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Bugsnag/Crashlytics package in `package.json`). Errors are logged via a custom helper `lib/utils/logError.ts` used throughout `convex/` action code, and `console.error` on the client.

**Logs:**
- Convex built-in function logs (via Convex dashboard, not configured in-repo)
- RevenueCat SDK log level set to `INFO` (`Purchases.setLogLevel(LOG_LEVEL.INFO)` in `context/SubscriptionContext.tsx`)

## CI/CD & Deployment

**Hosting:**
- Backend: Convex Cloud (managed serverless deployment)
- Mobile: EAS Build (Expo Application Services) → App Store / Google Play, per `eas.json` profiles (`development`, `development-simulator`, `production`)

**CI Pipeline:**
- None detected in-repo (no `.github/workflows`, no `.gitlab-ci.yml`). Builds are triggered manually via `npm run eas:dev` / `npm run eas:prod`.

## Environment Configuration

**Required env vars (see `.env.example`):**
- Convex/server: `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, `INGEST_TOKEN`, `JWKS`, `JWT_PRIVATE_KEY`, `SITE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENROUTER_API_KEY`, `REVENUECAT_SECRET_KEY`
- Client/Expo: `APP_VARIANT`, `CONVEX_DEPLOYMENT`, `CONVEX_INGEST_TOKEN`, `CONVEX_PROD_URL`, `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY`, `EXPO_PUBLIC_SUPPORT_EMAIL`

**Secrets location:**
- Local dev: `.env.local` (gitignored, present but not read for this analysis)
- CI/build: EAS Environment Variables, pulled locally with `npm run env:pull` (`eas env:pull --environment development`)
- Convex server secrets are set separately in the Convex deployment's environment settings (not in the mobile `.env` files)

## Webhooks & Callbacks

**Incoming:**
- OAuth callback routes for Google/Apple sign-in, mounted by `auth.addHttpRoutes(http)` in `convex/http.ts` (exact paths generated by `@convex-dev/auth`)
- `convex/foods/ingestFoods.ts` action acts as an authenticated bulk-ingest endpoint (shared-secret `INGEST_TOKEN`, not a public webhook but callable via `ConvexHttpClient` from `scripts/syncFoodsData.ts`)

**Outgoing:**
- None detected (no outbound webhook dispatch to third parties, e.g. no Stripe-style event webhooks). RevenueCat status is pulled (polled) via `syncSubscriptionStatus`, not pushed via webhook.

---

*Integration audit: 2026-08-04*
