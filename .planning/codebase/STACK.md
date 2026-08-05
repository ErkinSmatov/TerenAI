# Technology Stack

**Analysis Date:** 2026-08-04

## Languages

**Primary:**
- TypeScript 5.9.2 (strict mode) - Entire app (`app/`, `components/`, `lib/`, `context/`, `convex/`), config in `tsconfig.json`

**Secondary:**
- None. No JS-only source files besides config (`babel.config.js`, `metro.config.js`, `eslint.config.mjs`).

## Runtime

**Environment:**
- React Native 0.81.5 on Expo SDK 54 (`expo` ^54.0.21), New Architecture enabled (`newArchEnabled: true` in `app.config.ts`)
- Backend runtime: Convex serverless functions (`convex` ^1.27.3), deployed via `npx convex dev` / Convex cloud
- Node.js used for local scripts (`scripts/importFdcData.ts`, `scripts/syncFoodsData.ts`) via `ts-node`

**Package Manager:**
- npm (lockfile `package-lock.json` present, 627KB)

## Frameworks

**Core:**
- Expo Router ~6.0.14 - File-based navigation, root config `app.config.ts`, routes under `app/`
- React 19.1.0 / React DOM 19.1.0 - UI layer, with React Compiler enabled (`babel-plugin-react-compiler`, `experiments.reactCompiler: true`)
- React Navigation 7 (`@react-navigation/native`, `@react-navigation/bottom-tabs`) - underlies Expo Router's stack/tab navigation
- Convex ^1.27.3 - Backend-as-a-service: database, server functions (queries/mutations/actions), realtime sync, file storage; schema in `convex/schema.ts`

**Testing:**
- No test framework/runner detected. No `*.test.*`/`*.spec.*` files or Jest/Vitest config found in the repo.

**Build/Dev:**
- Metro bundler (`metro.config.js`) with `react-native-svg-transformer` for SVG-as-component imports
- Babel (`babel.config.js`) with `babel-preset-expo` and `react-native-worklets/plugin` (required by Reanimated 4)
- EAS Build/CLI (`eas.json`) for native builds and environment management
- ESLint 9 flat config (`eslint.config.mjs`) - `eslint-config-expo`, `typescript-eslint` (strict + stylistic type-checked), `eslint-plugin-react-compiler`, `@convex-dev/eslint-plugin` (enforces `@convex-dev/import-wrong-runtime`)

## Key Dependencies

**Critical:**
- `convex` / `convex-helpers` - Primary backend: DB, auth glue, server functions, realtime queries via `useQuery`/`useAction` (client) and `convex/server` (backend)
- `@convex-dev/auth` ^0.0.90 + `@auth/core` ^0.37.0 - Authentication framework wired in `convex/auth.ts`
- `ai` ^5.0.76 (Vercel AI SDK) - Unified interface for LLM calls (`generateObject`, `generateText`) used throughout `convex/meals/analyze/`
- `@ai-sdk/google` ^2.0.23 + `@google/generative-ai` ^0.24.1 - Google Gemini models (used for `gemini-embedding-001` text embeddings in `convex/meals/analyze/analyzeMealConfig.ts`)
- `@openrouter/ai-sdk-provider` ^1.4.1 - OpenRouter gateway for LLM chat models (primary model in use: `x-ai/grok-4.1-fast`), configured in `convex/ai.ts`
- `zod` ^4.1.5 (and `zod/v4` import path used in some files) - Schema validation for AI structured outputs and API response parsing
- `react-native-purchases` / `react-native-purchases-ui` ^9.6.11 - RevenueCat SDK for in-app subscriptions (`context/SubscriptionContext.tsx`, `components/paywall/Paywall.tsx`)
- `resend` ^6.1.1 - Transactional email (OTP sign-in codes) via `convex/ResendOTP.ts`

**Infrastructure:**
- `@convex-dev/rate-limiter` ^0.3.0 - Rate limits AI feature usage (`convex/rateLimit.ts`, 50 requests/day per user)
- `@convex-dev/migrations` ^0.3.0 - Schema/data migration component (`convex/migrations.ts`, `convex/convex.config.ts`)
- `react-native-mmkv` ^3.3.1 - Fast local key-value storage
- `expo-secure-store` ~15.0.7 - Secure storage backing Convex Auth token persistence (`components/RootLayoutProvider.tsx`)
- `expo-camera`, `expo-image-picker`, `expo-image-manipulator` - Meal photo capture/upload pipeline
- `react-native-reanimated` ^4.1.3 + `react-native-worklets` 0.5.1 + `react-native-gesture-handler` - Animation/gesture stack
- `@shopify/react-native-skia` 2.2.12 - Custom graphics/charts rendering
- `@gorhom/bottom-sheet` ^5.2.6 - Bottom sheet UI primitives
- `@rn-primitives/*` (alert-dialog, popover, portal) - Headless UI primitives
- `date-fns` ^4.1.0 - Date utilities
- `uuid` ^13.0.0 - ID generation
- `stream-json` / `stream-chain` - Streaming JSON parsing for large USDA FDC food-data import scripts (`scripts/importFdcData.ts`)

## Configuration

**Environment:**
- Managed via EAS Environment Variables (`eas.json`, `npm run env:pull` pulls into `.env.local`)
- `.env.example` documents required vars; `.env.local` present locally (gitignored, contents not read)
- Convex-side secrets (server only): `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, `INGEST_TOKEN`, `JWKS`, `JWT_PRIVATE_KEY`, `SITE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENROUTER_API_KEY`, `REVENUECAT_SECRET_KEY`
- Expo-side/client vars: `APP_VARIANT`, `CONVEX_DEPLOYMENT`, `CONVEX_INGEST_TOKEN`, `CONVEX_PROD_URL`, `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY`, `EXPO_PUBLIC_SUPPORT_EMAIL`
- App variant switching (`development` vs production) controlled by `APP_VARIANT` env var, read in `app.config.ts` to change bundle ID (`com.codetau.terenai.dev` vs `com.codetau.terenai`) and app name

**Build:**
- `app.config.ts` - Dynamic Expo config (TypeScript), owner `smatove`, EAS project id `616f0145-400b-4a1e-99d8-efea2681653f`, scheme `terenai`, typed routes + React Compiler experiments enabled
- `eas.json` - Build profiles: `development` (internal distribution, dev client), `development-simulator` (iOS simulator variant), `production` (auto-increment build number)
- `tsconfig.json` - extends `expo/tsconfig.base`, strict mode, path alias `@/*` → project root
- `convex/tsconfig.json` - separate TS config for Convex backend functions

## Platform Requirements

**Development:**
- Node.js (version not pinned via `.nvmrc`/`engines` field - not detected)
- Expo CLI / EAS CLI `>= 16.6.2` (`eas.json` `cli.version`)
- iOS/Android native folders (`ios/`, `android/`) exist on disk locally but are **gitignored and NOT committed** (`.gitignore:5-6`; `git ls-files ios/` returns 0 files). This is managed/CNG workflow — EAS regenerates native projects from `app.config.ts` on the build server, so config-plugin changes apply automatically without a manual `expo prebuild` + commit. *(Corrected 2026-08-05: the original audit claimed these folders were committed, inferring from their presence on disk.)*

**Production:**
- iOS App Store + Google Play (native builds via EAS, `eas:prod` script → `eas build --profile production`)
- Bundle identifiers: `com.codetau.terenai` (prod) / `com.codetau.terenai.dev` (dev)
- Convex cloud deployment (production URL stored as `CONVEX_PROD_URL`)

---

*Stack analysis: 2026-08-04*
