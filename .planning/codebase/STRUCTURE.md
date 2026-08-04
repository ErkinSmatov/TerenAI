# Codebase Structure

**Analysis Date:** 2026-08-04

## Directory Layout

```
CalYo/ (TerenAI)
├── app/                      # Expo Router routes (file-based navigation)
│   ├── _layout.tsx           # Root: providers + auth-gated Stack
│   ├── index.tsx             # Root redirect/landing route
│   ├── app/                  # Authenticated route group
│   │   ├── _layout.tsx       # Guards on auth + onboarding completion
│   │   ├── (tabs)/           # Bottom-tab routes: index (home), add, settings
│   │   ├── (add)/            # Add-meal flow: camera.tsx, describe.tsx
│   │   ├── (home)/           # nutrients.tsx (home sub-screen)
│   │   ├── (meal)/           # meal.tsx, fix-meal.tsx, mealNutrients.tsx
│   │   ├── (mealItem)/       # mealItem.tsx, mealItemNutrients.tsx
│   │   ├── (settings)/       # adjustMacroTargets.tsx, generateMacroTargets.tsx
│   │   └── paywall.tsx       # Paywall screen
│   ├── auth/                 # Unauthenticated route group (sign-in, OTP)
│   └── onboarding/            # Onboarding wizard route group
├── components/                # Feature + design-system React components
│   ├── ui/                    # Generic design-system primitives (Button, Card, TextInput, ...)
│   │   └── screen/            # Screen layout primitives (Header/Main/Footer)
│   ├── icons/                 # SVG icon components (macros/, micros/, dots/)
│   ├── meal/, mealItem/       # Meal + meal-item detail UI
│   ├── home/                  # Home tab UI (header, day selector, summaries)
│   ├── onboarding/            # Onboarding wizard UI (steps/basics|goal|program|end)
│   ├── camera/                # Camera capture UI (barcode/photo overlays, controls)
│   ├── settings/, paywall/, weight/, nutrients/, tabs/, auth/  # Other feature folders
│   ├── RootLayoutProvider.tsx # Combines all context providers
│   └── SplashScreenController.tsx
├── context/                   # React Context providers (global client state)
│   ├── AppContext.tsx          # MMKV-persisted local app data (Zod-validated)
│   ├── AuthContext.tsx         # Convex Auth wrapper
│   ├── OnboardingContext.tsx   # Onboarding wizard state
│   └── SubscriptionContext.tsx # RevenueCat subscription/paywall state
├── lib/                        # Framework-agnostic pure logic, grouped by domain
│   ├── nutrition/               # BMR, calorie/macro target calculators
│   ├── food/                    # Extract macros/micros/nutrients from a `foods` doc
│   ├── fdc/                     # USDA FoodData Central field mapping
│   ├── off/                     # Open Food Facts field mapping + fetch
│   ├── units/                   # Unit conversions (kg/lbs, in/cm, ...)
│   ├── image/                   # Image crop/processing helpers
│   ├── hooks/                   # Shared React hooks (useProfileStatus, reanimated/*)
│   ├── storage/mmkv.ts          # MMKV singleton wrapper
│   ├── typescript/              # Small TS utility types (optional.ts)
│   └── utils/                   # Misc helpers (logError, tryCatch, sleep, uuidv4, nutrition/*)
├── config/                     # App-wide constant/config objects
│   ├── appConfig.ts             # MMKV storage key etc.
│   ├── nutrientsConfig.ts       # Nutrient display config
│   ├── profilesConfig.ts        # Profile field config/options
│   ├── revenueCatConfig.ts      # RevenueCat API keys/entitlement ids
│   └── testingConfig.ts         # Test-user config
├── zod/schemas/                # Zod schemas for client-persisted data
│   └── AppDataSchema.ts
├── convex/                     # Convex backend (serverless functions + schema)
│   ├── schema.ts                # Table registry (composes convex/tables/*)
│   ├── tables/                  # Per-table field/validator definitions
│   │   ├── foods.ts, meals.ts, mealItems.ts, profiles.ts
│   ├── meals/                   # Meal domain functions
│   │   ├── createMeal.ts, getMeal.ts, updateMeal.ts, updateMealTotals.ts
│   │   ├── replaceMealItems.ts, getWeekMeals.ts
│   │   └── analyze/             # Multi-step AI meal-analysis pipeline
│   │       ├── analyzeMealPhoto.ts, analyzeMealDescription.ts, analyzeMealBarcode.ts
│   │       ├── analyzeMealConfig.ts   # Models + prompts, single source of truth
│   │       ├── detectMealItems.ts, detectMealItemsFromText.ts
│   │       ├── searchFdcCandidates.ts, selectCandidates.ts
│   │       ├── processDetectedItems.ts  # Orchestrates search→select→persist
│   │       ├── translateFood.ts, calculateHealthScore.ts, nameMeal.ts
│   │       └── correctMeal.ts, correctMealItems.ts
│   ├── mealItems/               # Meal-item domain functions (getMealItem, updateMealItem)
│   ├── foods/                   # Reference food domain (create/get/upsert/ingest/update)
│   ├── profiles/                # Profile domain (get/update/completeOnboarding/subscription sync)
│   ├── nutrition/                # computeNutritionTargets.ts
│   ├── home/                     # getStreak.ts
│   ├── storage/                  # generateUploadUrl.ts
│   ├── users/                    # deleteUser.ts
│   ├── utils/                    # backfillFoodEmbeddings.ts, countFoodEmbeddings.ts
│   ├── testing/                  # getOrCreateTestUser.ts (test-only helper)
│   ├── auth.ts, auth.config.ts, ResendOTP.ts  # Convex Auth setup
│   ├── ai.ts                     # openrouter client singleton
│   ├── rateLimit.ts              # Shared rate limiter instance
│   ├── migrations.ts             # Convex migrations component wiring
│   ├── convex.config.ts          # Installed Convex components (auth, migrations, rate-limiter)
│   ├── http.ts                   # HTTP router (auth callbacks)
│   ├── tsconfig.json
│   └── _generated/               # Framework-generated (never hand-edit)
├── scripts/                    # One-off/manual data scripts (run via ts-node, not app runtime)
│   ├── importFdcData.ts, syncFoodsData.ts
├── assets/                      # Fonts, images, svg (static assets)
├── android/, ios/               # Native project files (generated/managed by Expo/EAS)
├── app.config.ts                # Expo app config (dynamic)
├── eas.json                     # EAS Build profiles
├── babel.config.js, metro.config.js
├── eslint.config.mjs            # Flat ESLint config (expo + typescript-eslint strict + convex plugin)
├── tsconfig.json                # `@/*` path alias → repo root
├── index.ts                     # App entry (package.json "main")
└── declarations.d.ts, expo-env.d.ts
```

## Directory Purposes

**`app/`:**
- Purpose: Expo Router file-based routes — one file per screen/layout
- Contains: `_layout.tsx` (layout/provider wiring), route `.tsx` files, parenthesized route groups `(name)` for grouping without affecting the URL
- Key files: `app/_layout.tsx` (root auth gate), `app/app/_layout.tsx` (protected shell), `app/app/(tabs)/_layout.tsx` (tab bar)

**`components/`:**
- Purpose: All React UI, organized by feature domain, with a shared `ui/` design-system layer
- Contains: One folder per feature area matching route groups (`meal/`, `mealItem/`, `home/`, `onboarding/`, `settings/`, `camera/`, `paywall/`, `weight/`, `nutrients/`, `tabs/`, `auth/`), plus `ui/` (generic, feature-agnostic primitives) and `icons/`
- Key files: `components/RootLayoutProvider.tsx` (provider composition root)

**`context/`:**
- Purpose: App-wide React Context providers for cross-cutting client state not owned by Convex
- Contains: Exactly 4 provider files, one per concern (app data, auth, subscription, onboarding)

**`lib/`:**
- Purpose: Pure, testable, framework-light domain logic shared by client and (partially) Convex code
- Contains: Subfolders by domain (`nutrition/`, `food/`, `fdc/`, `off/`, `units/`, `image/`, `hooks/`, `storage/`, `typescript/`, `utils/`)
- Key files: `lib/storage/mmkv.ts` (storage singleton), `lib/utils/logError.ts` (logging entry point), `lib/hooks/useProfileStatus.ts` (auth/onboarding-gating hook)

**`config/`:**
- Purpose: Centralized constants/config objects consumed across client code (no secrets — actual secrets live in EAS/Convex env vars)
- Contains: One config file per concern

**`zod/schemas/`:**
- Purpose: Runtime validation schemas for data that persists outside Convex (MMKV-stored client app data)
- Contains: `AppDataSchema.ts`

**`convex/`:**
- Purpose: All backend logic — database schema, queries, mutations, actions, auth, and AI orchestration
- Contains: Domain folders each holding one Convex function per file (default export), `tables/` for schema field definitions, `_generated/` for framework output
- Key files: `convex/schema.ts` (schema registry), `convex/convex.config.ts` (installed components), `convex/meals/analyze/analyzeMealConfig.ts` (AI models + prompts)

**`scripts/`:**
- Purpose: Manual/offline data-maintenance scripts, not part of the running app or Convex deployment
- Contains: `importFdcData.ts` (bulk import USDA data), `syncFoodsData.ts`
- Generated: No — hand-written, run via `npm run script:importFdc`/`script:syncFoods`

**`assets/`:**
- Purpose: Static assets bundled with the app
- Contains: `fonts/`, `images/`, `svg/`, `img/` (note: both `images/` and `img/` exist — see naming inconsistency below)

**`android/`, `ios/`:**
- Purpose: Native platform projects
- Generated: Yes, managed by Expo prebuild/EAS (do not hand-edit generated files inside `ios/Pods/`, `android/app/build/`, etc.)
- Committed: `android/` and `ios/` are present in the repo (not using pure managed workflow); native source under `android/app/src/main/java/com/marcoshernanz/calyo` may need renaming/review given the app was rebranded to TerenAI (see `app.config.ts` for current bundle id)

## Key File Locations

**Entry Points:**
- `index.ts`: App entry (registers root component)
- `app/_layout.tsx`: Root layout + auth-based stack gating
- `convex/http.ts`: HTTP route registration (auth callbacks)

**Configuration:**
- `app.config.ts`: Expo dynamic app config (name, bundle id, plugins)
- `eas.json`: EAS Build/submit profiles
- `tsconfig.json`: TypeScript config, defines `@/*` → repo-root path alias
- `eslint.config.mjs`: Flat ESLint config (expo, typescript-eslint strict+stylistic type-checked, react-compiler, convex plugin)
- `convex/convex.config.ts`: Convex component registration (auth, migrations, rate-limiter)

**Core Logic:**
- `convex/schema.ts` + `convex/tables/*.ts`: Data model
- `convex/meals/analyze/`: AI meal-analysis pipeline
- `lib/nutrition/`: Nutrition/calorie/macro math

**Testing:**
- No dedicated test directory or test runner config detected (`jest.config.*`/`vitest.config.*` not present); `convex/testing/getOrCreateTestUser.ts` provides a test-user helper for manual/dev use, not an automated test framework.

## Naming Conventions

**Files:**
- Convex function files: `camelCase.ts` named after the function/verb, one function per file, exported as `default` (e.g. `createMeal.ts`, `getMealItem.ts`, `updateMealTotals.ts`)
- React components: `PascalCase.tsx` matching the exported component name (e.g. `components/meal/MealSummaryCard.tsx` exports `MealSummaryCard`)
- Route files: `camelCase.tsx` or `index.tsx`/`_layout.tsx` per Expo Router conventions; route groups use `(camelCase)` or `(lowercase)` parens (e.g. `(mealItem)`, `(tabs)`, `(settings)`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g. `lib/hooks/useProfileStatus.ts`)
- Lib utilities: `camelCase.ts` named after the function they export (e.g. `lib/utils/logError.ts` exports `logError`)
- Config files: `camelCase.ts` (e.g. `config/appConfig.ts`)
- Table definitions: `camelCase.ts` named after the plural table (e.g. `convex/tables/mealItems.ts` exports `mealItems` and `mealItemsFields`)

**Directories:**
- `components/`, `convex/`, `lib/`: lowercase, singular-domain folders (`meal/`, `foods/`, `nutrition/`) — note `convex/` uses plural for multi-record domains (`foods`, `meals`, `mealItems`, `profiles`, `users`) matching table names, while `lib/` mixes singular (`food/`, `image/`) and plural (`units/`, `hooks/`)
- Route groups: parenthesized `(name)` to organize without adding URL segments, matching the feature-component folder they render (e.g. `app/app/(meal)/` renders `components/meal/`)

## Where to Add New Code

**New Feature (full-stack, e.g. new meal-related capability):**
- Convex function(s): `convex/<domain>/<verbName>.ts` (one file per query/mutation/action, `export default`)
- Table changes: edit/add `convex/tables/<table>.ts`, register in `convex/schema.ts`
- Client screen: `app/app/<routeGroup>/<name>.tsx` (thin, fetch via `useQuery`/`useMutation`/`useAction`)
- Feature UI: `components/<domain>/<Name>.tsx`
- Pure logic/math: `lib/<domain>/<name>.ts` if reusable and framework-agnostic

**New AI pipeline step (meal analysis):**
- Add a new stage file in `convex/meals/analyze/`, wire it into the relevant top-level action (`analyzeMealPhoto.ts`/`analyzeMealDescription.ts`/`analyzeMealBarcode.ts`) or into `processDetectedItems.ts`
- Add/adjust model + prompt in `convex/meals/analyze/analyzeMealConfig.ts` rather than inlining prompts in the stage file

**New UI primitive (design system):**
- Add to `components/ui/` (or `components/ui/screen/` for layout primitives), following existing prop patterns in sibling files like `components/ui/Button.tsx`, `components/ui/Card.tsx`

**New shared/global client state:**
- Add a new provider in `context/`, wire it into `components/RootLayoutProvider.tsx` at the appropriate nesting position

**New unit conversion / nutrition calculation:**
- Add to `lib/units/` or `lib/nutrition/` respectively, as a small pure function file

**New external data source integration (like FDC/OFF):**
- Add a new folder under `lib/<sourceName>/` for field-mapping/extraction helpers, plus Convex functions under `convex/foods/` or a new domain folder for ingestion

## Special Directories

**`convex/_generated/`:**
- Purpose: Framework-generated `api`, `internal`, `dataModel`, `server` types/objects
- Generated: Yes (via `npx convex dev`/`convex deploy`)
- Committed: Yes (required for TypeScript type-checking without running `convex dev`), but never hand-edited

**`android/`, `ios/`:**
- Purpose: Native platform build projects (CNG/prebuild output + native config)
- Generated: Yes (Expo prebuild), `ios/Pods/` additionally generated by CocoaPods
- Committed: Yes for top-level native project files; `ios/Pods/` should typically be treated as regenerable

**`.expo/`, `node_modules/`:**
- Purpose: Local tool caches / dependencies
- Generated: Yes
- Committed: No

**`assets/img/`:**
- Purpose: Appears to be a newer/duplicate asset folder alongside `assets/images/` (contains a `Web/` subfolder); worth consolidating to avoid ambiguity about which folder is canonical for new image assets.
- Generated: No
- Committed: Yes (untracked at time of writing per git status — verify before adding new assets here)

---

*Structure analysis: 2026-08-04*
