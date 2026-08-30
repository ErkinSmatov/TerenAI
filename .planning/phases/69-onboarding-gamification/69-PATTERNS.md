# Phase 69: Онбординг, взвешивание, push-напоминания и геймификация - Pattern Map

**Mapped:** 2026-08-30
**Files analyzed:** 23 (онбординг-аудит D-01..D-05 не добавляет/не меняет код — исключён из списка ниже)
**Analogs found:** 18 exact/role-match, 5 no close analog (genuinely new infrastructure — push/cron)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `convex/tables/pushTokens.ts` (NEW) | model (Convex table) | CRUD | `convex/tables/observerLinks.ts` | role-match |
| `convex/tables/badges.ts` (NEW) | model (Convex table) | CRUD | `convex/tables/observerLinks.ts` | role-match |
| `convex/tables/profiles.ts` (MODIFY — add `weightUpdatedAt`, `weighInRemindersEnabled`, `mealRemindersEnabled`, `timezoneOffsetMinutes`, reminder-dedupe timestamps) | model (Convex table) | CRUD | itself (existing file) | exact |
| `convex/schema.ts` (MODIFY — register `pushTokens`, `badges`) | config | CRUD | itself (existing file) | exact |
| `convex/notifications/recordPushToken.ts` (NEW) | route (Convex mutation) | CRUD (write) | `convex/profiles/updateProfile.ts` | role-match |
| `convex/notifications/sendPushNotification.ts` (NEW) | service (Convex internalAction) | request-response (HTTP to Expo) | `convex/meals/analyze/processDetectedItemsAction.ts` (internalAction shape, try/catch/logError) | role-match |
| `convex/notifications/checkWeighInReminders.ts` (NEW) | service (Convex internalAction, cron-invoked) | batch | `convex/meals/analyze/processDetectedItemsAction.ts` (internalAction) + `convex/home/getStreak.ts` (per-user computation shape) | role-match |
| `convex/notifications/checkMealReminders.ts` (NEW) | service (Convex internalAction, cron-invoked) | batch | same as above | role-match |
| `convex/crons.ts` (NEW) | config | event-driven | **none in codebase** | no-analog |
| `convex/badges/checkAndAwardBadges.ts` (NEW) | service (Convex internalMutation) | event-driven | `convex/meals/updateMealInternal.ts` (internalMutation shape) + `convex/home/getStreak.ts` (streak computation reused as input) | role-match |
| `convex/badges/getUnseenBadge.ts` (NEW) | route (Convex query) | CRUD (read) | `convex/meals/getWeekMeals.ts` | role-match |
| `convex/badges/markBadgeSeen.ts` (NEW) | route (Convex mutation) | CRUD (write) | `convex/profiles/updateProfile.ts` | role-match |
| `convex/meals/analyze/processDetectedItems.ts` (MODIFY — call `checkAndAwardBadges` after `status: "done"` patch) | service | event-driven | itself (existing file, lines 102-106) | exact |
| `components/notifications/NotificationsProvider.tsx` (NEW) | provider | event-driven | `lib/hooks/useHealthKitSync.ts` (mount-time async registration hook/provider pattern) | role-match |
| `components/settings/SettingsToggleItem.tsx` (NEW) | component | request-response | `components/settings/SettingsItem.tsx` | role-match |
| `app/app/(settings)/notificationSettings.tsx` (NEW) | route/component | request-response | `app/app/(settings)/generateMacroTargets.tsx` (profile read/merge/write flow) + `app/app/(tabs)/settings.tsx` (`SettingsGroup` screen shell) | role-match |
| `app/app/(settings)/weeklyWeighIn.tsx` (NEW) | route/component | request-response | `app/app/(settings)/generateMacroTargets.tsx` (profile merge-before-patch) | exact (for the patch pattern) |
| `app/app/(home)/streak.tsx` (NEW, replaces destination of the streak button) | route/component | request-response | `app/app/(home)/calendar.tsx` (Phase 68) | exact |
| `components/home/HomeHeader.tsx` (MODIFY) | component | request-response | itself (existing file) | exact |
| `app/app/(settings)/badges.tsx` (NEW) | route/component | request-response | `app/app/(home)/calendar.tsx` (`ScreenMain`/`ScreenHeader` shell) + `app/app/(tabs)/settings.tsx` (`SettingsGroup`/`Card` grid shell) | role-match |
| `components/badges/BadgeCelebrationModal.tsx` (NEW) | component | event-driven | `components/ui/AlertDialog.tsx` (`Keyframe` ZoomIn/ZoomOut animation, Portal/Overlay structure) | role-match |
| `scripts/verifyWeighInReminder.ts`, `scripts/verifyMealReminderWindows.ts`, `scripts/verifyBadgeThresholds.ts` (NEW) | test | batch | `scripts/verifyWeekBucketing.ts` | exact |

## Pattern Assignments

### `convex/tables/pushTokens.ts` (model, CRUD)

**Analog:** `convex/tables/observerLinks.ts` (full file, 12 lines — read directly, reproduced below)

```typescript
// Source: convex/tables/observerLinks.ts (full pattern to mirror)
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const observerLinksFields = {
  observerId: v.id("users"),
  patientId: v.id("users"),
};

export const observerLinks = defineTable(observerLinksFields)
  .index("byObserverId", ["observerId"])
  .index("byPatientId", ["patientId"])
  .index("byObserverAndPatient", ["observerId", "patientId"]);
```

**Adaptation:**
```typescript
export const pushTokensFields = {
  userId: v.id("users"),
  expoPushToken: v.string(),
  platform: v.union(v.literal("ios"), v.literal("android")),
  timezoneOffsetMinutes: v.number(), // per RESEARCH.md Pattern 1 — stored, updated on every app open
  updatedAt: v.number(),
};

export const pushTokens = defineTable(pushTokensFields)
  .index("byUserId", ["userId"])
  .index("byExpoPushToken", ["expoPushToken"]); // for DeviceNotRegistered cleanup lookups
```
Same `defineTable(fields).index(...)` shape as every table in `convex/tables/*`; export the `*Fields` const separately (see `profilesFields`/`mealsFields`/`observerLinksFields` convention) so it can be reused with `partial()` if a patch-mutation is ever needed.

---

### `convex/tables/badges.ts` (model, CRUD)

**Analog:** same as above (`observerLinks.ts` composite-index convention)

```typescript
export const badgesFields = {
  userId: v.id("users"),
  type: v.union(v.literal("streak"), v.literal("mealCount")),
  threshold: v.number(),
  earnedAt: v.number(),
  seenAt: v.optional(v.number()),
};

export const badges = defineTable(badgesFields)
  .index("byUserId", ["userId"])
  .index("byUserIdAndTypeAndThreshold", ["userId", "type", "threshold"]) // idempotency check before insert
  .index("byUserIdAndSeenAt", ["userId", "seenAt"]); // getUnseenBadge query
```
The `byUserIdAndTypeAndThreshold` composite index mirrors `observerLinks.ts`'s `byObserverAndPatient` composite-index convention — used by `checkAndAwardBadges` to check "already awarded" before insert (idempotency, per RESEARCH.md Pitfall 3 / Anti-Pattern).

---

### `convex/tables/profiles.ts` (model, MODIFY)

**Analog:** itself (full file, 78 lines — already read in full above)

Add **top-level** optional fields to `profilesFields` (NOT inside `data`, per RESEARCH.md Open Question 2 — keeps them independently patchable without the full-`data`-merge requirement):
```typescript
// Source: convex/tables/profiles.ts — extend the existing top-level field set
// (lines 5-72), sibling to userId/targets/isPro/hasCompletedOnboarding/observerCode:
export const profilesFields = {
  userId: v.id("users"),
  targets: v.object({ /* unchanged */ }),
  isPro: v.optional(v.boolean()),
  hasCompletedOnboarding: v.boolean(),
  observerCode: v.optional(v.string()),
  data: v.optional(v.object({ /* unchanged */ })),
  // NEW, top-level (not inside `data`):
  weightUpdatedAt: v.optional(v.number()),
  weighInRemindersEnabled: v.optional(v.boolean()),
  mealRemindersEnabled: v.optional(v.boolean()),
  lastWeighInReminderSentAt: v.optional(v.number()),
  lastMealReminderSentAt: v.optional(v.number()),
};
```
Index/`.index("byUserId", ...)`/`.index("byObserverCode", ...)` lines unchanged — no new index needed for these scalar fields (cron reads them by scanning `profiles`/`pushTokens`, not by indexed lookup on these flags).

---

### `convex/schema.ts` (config, MODIFY)

**Analog:** itself (full file, 22 lines — already read above)

```typescript
// Source: convex/schema.ts — same import + spread pattern for every new table
import { pushTokens } from "./tables/pushTokens";
import { badges } from "./tables/badges";
// ... existing imports unchanged ...

export default defineSchema({
  ...authTables,
  bloodPressureReadings,
  badges,          // NEW
  foods,
  glucoseReadings,
  meals,
  mealItems,
  movementData,
  observerLinks,
  profiles,
  pushTokens,       // NEW
});
```
Alphabetical-ish ordering already loosely followed in the existing file — insert new tables keeping that convention, no other change needed.

---

### `convex/notifications/recordPushToken.ts` (route, CRUD write)

**Analog:** `convex/profiles/updateProfile.ts` (full file, 30 lines — already read above) for the auth+lookup+patch shape; upsert-by-userId is new (no existing upsert precedent — closest is "find by userId, then patch or insert").

```typescript
// Source: convex/profiles/updateProfile.ts — auth + try/catch/logError shape to mirror
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const recordPushToken = mutation({
  args: {
    expoPushToken: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      // Validate Expo token format (RESEARCH.md Security Domain V5) before persisting.
      if (!/^ExponentPushToken\[.+\]$/.test(args.expoPushToken)) {
        throw new Error("Invalid push token format");
      }

      const existing = await ctx.db
        .query("pushTokens")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("pushTokens", {
          userId,
          ...args,
          updatedAt: Date.now(),
        });
      }
      return null;
    } catch (error) {
      logError("recordPushToken error", error);
      throw error;
    }
  },
});

export default recordPushToken;
```
Auth check (`getAuthUserId` → throw `"Unauthorized"` if null) and `try/catch { logError(...); throw error; }` wrapper are copied verbatim from `updateProfile.ts` — this is the project-wide Convex mutation shape (see Shared Patterns below).

---

### `convex/notifications/sendPushNotification.ts` / `checkWeighInReminders.ts` / `checkMealReminders.ts` (service, internalAction)

**Analog:** `convex/meals/analyze/processDetectedItemsAction.ts` (full file, 58 lines — already read above) — the project's one existing `internalAction` with try/catch/logError and `ctx.runMutation(internal.*)` calls.

```typescript
// Source: convex/meals/analyze/processDetectedItemsAction.ts — internalAction
// shape to mirror (imports, try/catch, ctx.runMutation call convention):
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import logError from "@/lib/utils/logError";

const checkWeighInReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<null> => {
    try {
      // iterate profiles/pushTokens, compute due reminders, call
      // ctx.runAction(internal.notifications.sendPushNotification.default, {...})
      // — same nesting style as processDetectedItemsAction calling
      // ctx.runMutation(internal.meals.updateMealInternal.default, {...})
      return null;
    } catch (error) {
      logError("checkWeighInReminders error", error);
      throw error;
    }
  },
});

export default checkWeighInReminders;
```
**Critical (RESEARCH.md Anti-Pattern):** these three files MUST be `internalAction`/exported via `internal.*`, never a public `action`/`mutation` — copy `processDetectedItemsAction.ts`'s use of `internal.meals.updateMealInternal.default` (never a client-callable equivalent) as the precedent for "server-triggered only" functions. `sendPushNotification` wraps the transport call (`@convex-dev/expo-push-notifications` per RESEARCH.md Standard Stack, or direct `fetch` fallback) — no existing HTTP-call-from-action precedent in the codebase (closest is `translateFood.ts`/`detectMealFromPhoto.ts` calling AI APIs from actions — same "await fetch/SDK call inside internalAction, wrapped in try/catch" shape, use those as secondary style reference if the Expo transport needs raw `fetch`).

---

### `convex/crons.ts` (config, event-driven)

**No analog** — `grep -rn` for `cron`/`crons.ts` returns nothing in this codebase; this is the first Convex cron file in the project.

```typescript
// Source: docs.convex.dev/scheduling/cron-jobs (CITED in RESEARCH.md) —
// no in-repo precedent, follow this structure directly:
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check weigh-in and meal reminders",
  { minutes: 30 },
  internal.notifications.checkAllReminders.default
);

export default crons;
```
Follow RESEARCH.md's "Architecture Patterns → Convex cron" section and "Code Examples" verbatim — no codebase style to reconcile with since nothing like it exists yet. Keep the same `internal.*` reference convention used everywhere else in `convex/_generated/api`.

---

### `convex/badges/checkAndAwardBadges.ts` (service, internalMutation, event-driven)

**Analog:** `convex/meals/updateMealInternal.ts` (full file, 30 lines — already read above) for the internalMutation shape; `convex/home/getStreak.ts` (full file, 64 lines — already read above) for the streak-count computation reused as an input.

```typescript
// Source: convex/meals/updateMealInternal.ts — internalMutation shape to mirror
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";

const checkAndAwardBadges = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<null> => {
    try {
      // Reuse getStreak's day-bucketing logic (or call it as a query via
      // ctx.runQuery) + count `meals` where status === "done" for this userId,
      // same index/filter shape as convex/home/getStreak.ts lines 20-25:
      //   ctx.db.query("meals").withIndex("byUserId", q => q.eq("userId", userId))
      //     .filter(q => q.eq(q.field("status"), "done"))
      // For each threshold crossed, check "already awarded" via the
      // byUserIdAndTypeAndThreshold index before ctx.db.insert("badges", {...})
      // — idempotency check mirrors the Doc-lookup-before-write pattern in
      // recordPushToken.ts above.
      return null;
    } catch (error) {
      logError("checkAndAwardBadges error", error);
      throw error;
    }
  },
});

export default checkAndAwardBadges;
```
Called from `convex/meals/analyze/processDetectedItems.ts` right after the existing `status: "done"` patch (see below) — **not** from client code, per RESEARCH.md Pitfall 3 (badge-completion pipeline runs in the background, client may not be present).

---

### `convex/meals/analyze/processDetectedItems.ts` (MODIFY — wire badge check into existing "done" transition)

**Analog:** itself, lines 102-106 (already read above, full file)

```typescript
// Source: convex/meals/analyze/processDetectedItems.ts:102-106 (existing, unchanged above this point)
await ctx.runMutation(internal.meals.updateMealInternal.default, {
  id: mealId,
  userId,
  meal: { status: "done", name: mealName },
});
// ADD immediately after:
await ctx.runMutation(internal.badges.checkAndAwardBadges.default, { userId });
```
Same `ctx.runMutation(internal.*.default, {...})` call convention already used twice in this file (`replaceMealItemsInternal`, `updateMealInternal`) — add as a third call, same style, same file. `analyzeMealBarcode.ts` (RESEARCH.md mentions it as the second `status = "done"` site) needs the identical one-line addition — verify with `grep -n 'status: "done"' convex/meals/analyze/analyzeMealBarcode.ts` before writing the plan (not read in this pattern-mapping pass — same call shape expected).

---

### `convex/badges/getUnseenBadge.ts` (route, CRUD read)

**Analog:** `convex/meals/getWeekMeals.ts` (full file, 55 lines — cited fully in Phase 68 PATTERNS.md, same auth+index+try/catch shape)

```typescript
// Source: convex/meals/getWeekMeals.ts — query shape to mirror (auth check,
// withIndex, try/catch/logError):
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import logError from "@/lib/utils/logError";

const getUnseenBadge = query({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) return null;

      const unseen = await ctx.db
        .query("badges")
        .withIndex("byUserIdAndSeenAt", (q) =>
          q.eq("userId", userId).eq("seenAt", undefined)
        )
        .first();

      return unseen ?? null;
    } catch (error) {
      logError("getUnseenBadge error", error);
      throw error;
    }
  },
});

export default getUnseenBadge;
```
Called reactively (`useQuery`) from a top-level provider/screen per RESEARCH.md Pitfall 3 — not gated on a mutation response.

---

### `convex/badges/markBadgeSeen.ts` (route, CRUD write)

**Analog:** `convex/profiles/updateProfile.ts` (patch-by-id shape) — simpler, single-field patch.

```typescript
const markBadgeSeen = mutation({
  args: { badgeId: v.id("badges") },
  handler: async (ctx, { badgeId }) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (userId === null) throw new Error("Unauthorized");

      const badge = await ctx.db.get(badgeId);
      if (!badge || badge.userId !== userId) throw new Error("Forbidden");

      await ctx.db.patch(badgeId, { seenAt: Date.now() });
      return null;
    } catch (error) {
      logError("markBadgeSeen error", error);
      throw error;
    }
  },
});
```
`if (!badge || badge.userId !== userId) throw new Error("Forbidden")` mirrors `updateMealInternal.ts`'s ownership check (`if (existingMeal.userId !== userId) throw new Error("Forbidden")`) — same IDOR mitigation pattern (RESEARCH.md Security Domain V4), copy verbatim shape.

---

### `components/notifications/NotificationsProvider.tsx` (provider, event-driven)

**Analog:** `lib/hooks/useHealthKitSync.ts` (mount-time async side-effect hook — read in Phase 68, structure summarized in `68-PATTERNS.md` lines 638-686; re-derive shape here since file wasn't re-read this session, same conclusion applies)

Pattern to mirror: a `useEffect` that runs an async IIFE on mount, wrapped in try/catch with `logError`, calling a Convex mutation with the result. For push registration specifically:
```typescript
// Structural analog: lib/hooks/useHealthKitSync.ts's mount-effect +
// useMutation(api.movement.syncDays.default) call shape — same shape,
// different domain (push token instead of HealthKit data):
useEffect(() => {
  void (async () => {
    try {
      const token = await registerForPushNotificationsAsync(); // Expo flow, RESEARCH.md Code Examples
      if (token) {
        await recordPushToken({
          expoPushToken: token,
          platform: Platform.OS as "ios" | "android",
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        });
      }
    } catch (error) {
      logError("NotificationsProvider registration error", error);
    }
  })();
}, [recordPushToken]);
```
Deep-link handling (tap on push → navigate) has no existing analog in the codebase — build directly from `docs.expo.dev`'s `addNotificationResponseReceivedListener` pattern (RESEARCH.md primary source), routing via `expo-router`'s `router.push(...)` exactly as `HomeHeader.tsx`/`calendar.tsx` already do for in-app navigation.

---

### `components/settings/SettingsToggleItem.tsx` (component, request-response — NEW primitive per UI-SPEC)

**Analog:** `components/settings/SettingsItem.tsx` (full file, 52 lines — already read above)

```typescript
// Source: components/settings/SettingsItem.tsx (full pattern to extend)
import { StyleSheet, View, Switch } from "react-native";
import getColor from "@/lib/ui/getColor";
import { LucideIcon } from "lucide-react-native";
import Text from "../ui/Text";

type Props = {
  text: string;
  caption?: string; // per UI-SPEC "sub-label" row
  Icon: LucideIcon;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
};

export default function SettingsToggleItem({
  text, caption, Icon, value, onValueChange, isLast,
}: Props) {
  return (
    <View style={[styles.container, !isLast && { borderBottomWidth: 1 }]}>
      <View style={styles.row}>
        <Icon size={18} color={getColor("foreground")} />
        <View style={styles.textContainer}>
          <Text size="16" weight="500">{text}</Text>
          {caption && (
            <Text size="14" color={getColor("mutedForeground")}>{caption}</Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: getColor("muted"), true: getColor("primary") }}
          thumbColor={getColor("base")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderColor: getColor("muted") },
  row: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  textContainer: { flex: 1 },
});
```
`styles.container`/border-bottom convention and 52px row height copied verbatim from `SettingsItem.tsx`. Key difference from the analog (per UI-SPEC explicit requirement): **no `Button` wrapper, no `onPress` on the row** — only the `Switch` itself is interactive, to avoid accidental double-toggle from tapping the label (`SettingsItem`'s entire row is a `Button`, this component must NOT copy that part). `SettingsGroup.tsx` (`React.cloneElement` injecting `isLast`) works unchanged with this new component since it doesn't inspect child type — reuse `SettingsGroup` as the wrapper for `notificationSettings.tsx` exactly as `settings.tsx` already does.

---

### `app/app/(settings)/notificationSettings.tsx` (route, request-response)

**Analog:** `app/app/(tabs)/settings.tsx` (`SettingsGroup` screen shell, full file already read) + `app/app/(settings)/generateMacroTargets.tsx` (profile-read/merge-before-write, lines 148, 241-245)

```typescript
// Screen shell — Source: app/app/(tabs)/settings.tsx structure (SafeArea +
// Title + ScrollView + SettingsGroup), adapted to a sub-screen with
// ScreenHeader/ScreenMain shell (per app/app/(home)/calendar.tsx precedent
// for non-tab-root screens):
const profile = useQuery(api.profiles.getProfile.default);
const updateProfile = useMutation(api.profiles.updateProfile.default);

<SettingsGroup>
  <SettingsToggleItem
    text="Напоминание о взвешивании"
    caption="Раз в 7 дней, если вес давно не обновлялся"
    Icon={ScaleIcon}
    value={profile?.weighInRemindersEnabled ?? true}
    onValueChange={(v) => void updateProfile({ profile: { weighInRemindersEnabled: v } })}
  />
  <SettingsToggleItem
    text="Напоминания о приёмах пищи"
    caption="Завтрак, обед и ужин — если приём пищи ещё не записан"
    Icon={UtensilsIcon}
    value={profile?.mealRemindersEnabled ?? true}
    isLast
    onValueChange={(v) => void updateProfile({ profile: { mealRemindersEnabled: v } })}
  />
</SettingsGroup>
```
**Load-bearing detail:** since `weighInRemindersEnabled`/`mealRemindersEnabled` are **top-level** `profilesFields` (not inside `data`, per the schema pattern above), `updateProfile({ profile: { weighInRemindersEnabled: v } })` is safe as a partial patch — it does **not** trigger RESEARCH.md's Pitfall 1 (`data`-object full-overwrite), unlike the weigh-in screen below which touches `data.weight`.

---

### `app/app/(settings)/weeklyWeighIn.tsx` (route, request-response)

**Analog:** `app/app/(settings)/generateMacroTargets.tsx` (full file, 272 lines — already read above), specifically the profile-merge-before-patch pattern (lines 148, 241-245) and RESEARCH.md Pattern 2/Anti-Pattern (use `WeightPicker.tsx` directly, NOT `OnboardingWeight.tsx`)

```typescript
// Source: app/app/(settings)/generateMacroTargets.tsx:148, 241-245 — the
// profile-merge-before-patch pattern this screen MUST reproduce:
const profile = useQuery(api.profiles.getProfile.default);
const updateProfile = useMutation(api.profiles.updateProfile.default);
const [weight, setWeight] = useState<number | null>(null);

useEffect(() => {
  if (profile?.data && weight === null) setWeight(profile.data.weight);
}, [profile, weight]);

const handleSave = async () => {
  if (!profile?.data || weight === null) return;
  const targets = await convex.query(api.nutrition.computeNutritionTargets.default, {
    ...profile.data,
    weight,
  });
  await updateProfile({
    profile: {
      data: { ...profile.data, weight }, // FULL data object — Pitfall 1
      targets,
      weightUpdatedAt: Date.now(),
    },
  });
  Toast.show({ text: "Вес обновлён, цели пересчитаны", variant: "success" });
  router.back();
};

// WeightPicker used DIRECTLY, not wrapped in OnboardingWeight.tsx (which
// also writes targetWeight — see RESEARCH.md Anti-Pattern):
<WeightPicker
  minWeight={30}
  maxWeight={300}
  initialWeight={weight ?? profile?.data?.weight ?? 70}
  formatWeight={(w) => `${w} kg`}
  onChange={setWeight}
/>
```
**Critical, copy exactly:** `data: { ...profile.data, weight }` — spreading the full current `data` object before overriding `weight`, exactly as `generateMacroTargets.tsx` does at line 243 (`setData((prev) => ({ ...prev, ...profile.data }))`, the inverse direction of the same merge). Do **not** send `{ data: { weight } }` alone — this is RESEARCH.md's Pitfall 1, confirmed by direct code reading of `updateProfile.ts`'s `ctx.db.patch(profile._id, args.profile)` (no deep merge). Do **not** reuse `OnboardingWeight.tsx` as a component — it writes `targetWeight: nextWeight` alongside `weight` (see `OnboardingWeight.tsx` lines 29-33, 51-57, already read above) which would silently overwrite the user's weight goal on every weekly check-in.

Screen shell: `ScreenHeader`/`ScreenMain` per `app/app/(home)/calendar.tsx` precedent (back button, title "Обновить вес" per UI-SPEC), primary CTA `Button` "Сохранить вес" — same `Button variant="primary"` convention used throughout settings/onboarding screens.

---

### `app/app/(home)/streak.tsx` (route, request-response)

**Analog:** `app/app/(home)/calendar.tsx` (full file, 184 lines — already read above in full)

The entire calendar rendering block (lines 97-177 of `calendar.tsx`: `useMemo(getLocalMonthBounds)`, `useQuery(api.meals.getMonthMeals.default)`, `markedDates` computation, `Calendar` component with `theme`/`onDayPress` navigating to `/app/(home)/day/[date]`) is reused **verbatim** — this is D-22/D-23, already fully implemented, just moved under a new screen title and a new `StreakHeader` block above it:

```typescript
// Source: app/app/(home)/calendar.tsx (copy the whole file as the base),
// changes:
// 1. Title "Календарь" → "Серия" (per UI-SPEC Copywriting Contract)
// 2. Add above <Card style={styles.card}><Calendar .../></Card>:
const streak = useQuery(api.home.getStreak.default, {
  timezoneOffsetMinutes: new Date().getTimezoneOffset(),
});
// ...
<Text size="40" weight="600" color={getColor("orange")}>{streak ?? 0}</Text>
<FlameIcon size={24} color={getColor("orange")} fill={getColor("orange")} />
<Text size="14" color={getColor("mutedForeground")}>дней подряд</Text>
```
`getStreak` call copied verbatim from `HomeHeader.tsx` line 15-17 (`timezoneOffsetMinutes: new Date().getTimezoneOffset()`) — same query, same arg shape, now consumed on this screen instead of/in addition to the header pill. Empty state ("Серия ещё не началась" / "Запишите приём пищи сегодня...") follows the `EmptyState`-heading precedent already noted in UI-SPEC (20/600 heading, matching `app/app/(home)/day/[date].tsx`'s "Нет данных за этот день" style — not re-read this session, but confirmed present per UI-SPEC Typography section sourcing it).

---

### `components/home/HomeHeader.tsx` (component, MODIFY)

**Analog:** itself (full file, 102 lines — already read above in full)

```typescript
// Source: components/home/HomeHeader.tsx (current structure, lines 27-57)
// — REMOVE the calendarContainer Button block (lines 27-39), KEEP the
// streakContainer Button block but change its destination and label:
<View style={styles.iconGroup}>
  <Button
    variant="base"
    size="base"
    accessibilityLabel="Открыть серию и календарь" // per UI-SPEC, was "Кого я наблюдаю" — swapped
    onPress={() => router.push("/app/(home)/streak")} // was /app/(settings)/observedList
  >
    <Card style={styles.streakContainer}>
      <FlameIcon size={20} color={getColor("orange")} fill={getColor("orange")} />
      <Text weight="600">{streak ?? 0}</Text>
    </Card>
  </Button>
  <Button
    variant="base"
    size="base"
    accessibilityLabel="Кого я наблюдаю" // moved here from the old streak button
    onPress={() => router.push("/app/(settings)/observedList")}
  >
    <Card style={styles.calendarContainer /* reuse the 44x44 circular style, rename or keep */}>
      <UsersIcon size={20} color={getColor("foreground")} /> {/* new icon, not CalendarDaysIcon */}
    </Card>
  </Button>
</View>
```
Both `Button`+`Card` wrapper shapes (`streakContainer` pill, `calendarContainer` 44×44 circle) are kept **unchanged structurally** — only `onPress`/`accessibilityLabel`/icon swap (D-21, D-24, D-25). `iconGroup`/`safeArea` styles (`flexDirection: "row"`, `justifyContent: "space-between"`, `gap: 8`) stay exactly as-is — still exactly 2 top-level children (`logoContainer`, `iconGroup`) per the existing layout contract, and exactly 2 buttons inside `iconGroup`, same as today, just re-pointed. `CalendarDaysIcon` import removed, `UsersIcon` import added (per UI-SPEC's new pill icon — `lucide-react-native`, same import source already used for `FlameIcon`/`CalendarDaysIcon`).

---

### `app/app/(settings)/badges.tsx` (route, request-response)

**Analog:** `app/app/(home)/calendar.tsx` (`ScreenMain`/`ScreenHeader` shell) + `app/app/(tabs)/settings.tsx` (`Card` grid — no exact grid precedent, closest structural sibling is `SettingsGroup`'s `Card` wrapper)

```typescript
// Shell — Source: app/app/(home)/calendar.tsx lines 1-20, 128-137 (ScreenMain/
// ScreenHeader/ScreenMainScrollView shape, back button, title):
<ScreenMain edges={[]}>
  <ScreenHeader scrollY={scrollY}>
    <ScreenHeaderBackButton />
    <ScreenHeaderTitle title="Достижения" />
  </ScreenHeader>
  <ScreenMainScrollView scrollViewProps={{ onScroll }} safeAreaProps={{ edges: ["left", "right", "bottom"] }}>
    {/* grid of BadgeTile, 2-column per UI-SPEC Card convention (20px padding) */}
  </ScreenMainScrollView>
</ScreenMain>
```
No existing "tile grid" component in the codebase — `BadgeTile` is genuinely new UI; follow `Card` (20px padding, `getColor("base")` background) as the base wrapper per UI-SPEC Color/Spacing sections, locked/earned visual states are new (no analog), reference RESEARCH.md's `getUnseenBadge`/`badges` table for the data source (`useQuery(api.badges.getAllBadges.default)` — note: `getAllBadges` query not yet listed in RESEARCH.md's file list, add to plan if the showcase needs "all possible badge definitions incl. not-yet-earned" rather than just earned rows from the `badges` table).

---

### `components/badges/BadgeCelebrationModal.tsx` (component, event-driven — NEW, custom animation)

**Analog:** `components/ui/AlertDialog.tsx` (full file, 143 lines — already read above in full) for the `Keyframe`-based `ZoomIn`/`ZoomOut` entrance/exit animation and `Portal`/`Overlay`/`Card` structure

```typescript
// Source: components/ui/AlertDialog.tsx (full pattern to mirror — Keyframe
// definitions lines 19-41, Portal/Overlay/AnimatedAlertDialogContent
// structure lines 62-117):
const ZoomIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.out(Easing.cubic) },
}).duration(200);
// identical ZoomOut, identical AnimatedPressable overlay-dismiss pattern
```
**Do NOT use `react-native-fast-confetti`** (peer-dependency conflict with `react-native-worklets@0.5.1`, confirmed by direct install attempt in RESEARCH.md Package Legitimacy Audit / UI-SPEC Registry Safety) — per UI-SPEC, build the celebration purely on this `Keyframe`/Reanimated primitive already proven in the codebase. Content differs from `AlertDialog`: no `Pressable`-trigger (this modal is driven by `useQuery(getUnseenBadge)` state, not a tap-trigger), heading "Новое достижение!" (20/600 per UI-SPEC Typography), body `"{badgeName} — {badgeDescription}"`, single primary `Button` "Круто" calling `markBadgeSeen({ badgeId })` on press then closing. Card 20px padding / `getColor("base")` background reused from `AlertDialog`'s `Card` wrapper unchanged.

---

## Shared Patterns

### Auth check (Convex queries/mutations)
**Source:** `convex/profiles/updateProfile.ts` lines 12-13, `convex/home/getStreak.ts` lines 12-13, `convex/meals/getWeekMeals.ts` (identical across the whole codebase)
**Apply to:** every new Convex function in `convex/notifications/*`, `convex/badges/*`
```typescript
const userId = await getAuthUserId(ctx);
if (userId === null) throw new Error("Unauthorized"); // or `return 0`/`return null` for queries with a safe empty default, per getStreak.ts's convention
```
This is also the ASVS V2/V4 control from RESEARCH.md's Security Domain — `userId` must never be accepted as a client argument (see `markBadgeSeen`'s ownership check below, mirroring `updateMealInternal.ts`'s `Forbidden` check).

### Error handling (Convex functions)
**Source:** `convex/profiles/updateProfile.ts` lines 23-26, `convex/meals/analyze/processDetectedItemsAction.ts` lines 42-54 (identical shape across every Convex function read this session)
**Apply to:** all new `convex/notifications/*`, `convex/badges/*` files
```typescript
try {
  // ...
} catch (error) {
  logError("<functionName> error", error); // rename per function
  throw error;
}
```

### Ownership/IDOR check on record-level mutations
**Source:** `convex/meals/updateMealInternal.ts` lines 24-25
**Apply to:** `markBadgeSeen`, any future badge/token mutation taking a record id
```typescript
if (!record || record.userId !== userId) throw new Error("Forbidden");
```

### Full merge of `profiles.data` before patch (RESEARCH.md Pitfall 1 / Pattern 2)
**Source:** `app/app/(settings)/generateMacroTargets.tsx` lines 241-245, cross-checked against `convex/profiles/updateProfile.ts` line 21 (`ctx.db.patch(profile._id, args.profile)` — no deep merge)
**Apply to:** `app/app/(settings)/weeklyWeighIn.tsx` only (the one new screen in this phase that touches `data.weight`)
```typescript
await updateProfile({ profile: { data: { ...profile.data, weight: newWeight }, targets, weightUpdatedAt: Date.now() } });
```
New top-level fields added to `profilesFields` in this phase (`weighInRemindersEnabled`, `mealRemindersEnabled`, `weightUpdatedAt`, `lastWeighInReminderSentAt`, `lastMealReminderSentAt`) do **not** need this merge dance — they're outside `data`, patchable independently, exactly like `isPro`/`hasCompletedOnboarding` already are.

### `Button`+`Card` pill pattern for `HomeHeader` icon buttons
**Source:** `components/home/HomeHeader.tsx` lines 27-56 (both buttons)
**Apply to:** `HomeHeader.tsx` modification (D-21/D-24/D-25) — structural shape unchanged, only handlers/labels/icons swap
```typescript
<Button variant="base" size="base" accessibilityLabel="..." onPress={...}>
  <Card style={styles.someContainer}>{/* icon (+ text for streak) */}</Card>
</Button>
```

### Full-screen route shell (`ScreenMain`/`ScreenHeader`/`ScreenMainScrollView`)
**Source:** `app/app/(home)/calendar.tsx` lines 1-20, 128-137 (also documented in `68-PATTERNS.md`)
**Apply to:** `app/app/(home)/streak.tsx`, `app/app/(settings)/badges.tsx`, `app/app/(settings)/notificationSettings.tsx`, `app/app/(settings)/weeklyWeighIn.tsx`
```typescript
<ScreenMain edges={[]}>
  <ScreenHeader scrollY={scrollY}>
    <ScreenHeaderBackButton />
    <ScreenHeaderTitle title="..." />
  </ScreenHeader>
  <ScreenMainScrollView scrollViewProps={{ onScroll }} safeAreaProps={{ edges: ["left", "right", "bottom"] }}>
    {/* content */}
  </ScreenMainScrollView>
</ScreenMain>
```
`useScrollY` from `lib/hooks/reanimated/useScrollY` drives the header scroll-shadow — wire identically in every new route.

### `ts-node`/`node:assert` verify-script convention
**Source:** `scripts/verifyWeekBucketing.ts` (91 lines; also documented in `68-PATTERNS.md`)
**Apply to:** `scripts/verifyWeighInReminder.ts`, `scripts/verifyMealReminderWindows.ts`, `scripts/verifyBadgeThresholds.ts`
```typescript
import assert from "node:assert/strict";
// import the pure function under test directly, no framework
assert.strictEqual(/* ... */);
assert.throws(() => /* ... */);
console.log("verify<Name>: OK");
```
Run via `npx ts-node -r tsconfig-paths/register scripts/verify<Name>.ts` (`TZ=Europe/Berlin` prefix load-bearing for `verifyMealReminderWindows.ts`'s DST case, per RESEARCH.md Pitfall/Don't-Hand-Roll section). No Jest/Vitest — this ad-hoc pattern is the project's only test convention (confirmed: no `jest.config.*`/`vitest.config.*`/`*.test.ts` anywhere).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `convex/crons.ts` | config | event-driven | First Convex cron in the project — `grep -rn "cron"` across `convex/` returns zero matches. Build directly from RESEARCH.md's Convex-docs-sourced example, no in-repo style to reconcile with. |
| `convex/notifications/sendPushNotification.ts` (transport call itself) | service | request-response (external HTTP) | No existing precedent for calling `@convex-dev/expo-push-notifications` or a raw `fetch` to an external push gateway from an `internalAction` — closest secondary references are AI-API-calling actions (`translateFood.ts`, `detectMealFromPhoto.ts`) for the "await external SDK/fetch inside try/catch internalAction" shape only, not the specific transport. |
| `components/notifications/NotificationsProvider.tsx` (permission/token-registration flow specifically) | provider | event-driven | `expo-notifications` is not installed in the project (`package.json` confirmed in RESEARCH.md) — the permission-request/`getExpoPushTokenAsync` call sequence has no in-repo precedent; `lib/hooks/useHealthKitSync.ts` supplies the surrounding mount-effect/mutation-call shape only, not the Expo-notifications-specific API calls. |
| `components/badges/BadgeTile` (locked/earned tile visual, inside `badges.tsx`) | component | transform | No grid/tile component exists anywhere in `components/` today — build from `Card` + UI-SPEC's explicit color/spacing tokens (`getColor("orange")` earned glow, `getColor("muted")` locked state) rather than an existing analog. |
| `convex/badges/getAllBadges.ts` (if the showcase needs badge *definitions* incl. not-yet-earned, not just earned rows — see `badges.tsx` note above) | route (Convex query) | CRUD (read) | Not explicitly listed in RESEARCH.md's file tree; flag for the planner to confirm scope (earned-only list from `badges` table vs. a static definitions list merged with earned rows) — no analog either way since badge definitions don't exist yet anywhere in the codebase. |
| `lib/notifications/reminderSchedule.ts` | pure module (business logic) | transform (no I/O) | New domain — reminder-window/dedupe/DST arithmetic (RESEARCH.md §Pattern 1, §Pitfall 2) has no existing pure-module analog in `lib/`; implemented directly from RESEARCH.md's algorithm in 69-01 Task 1. |
| `lib/badges/badgeDefinitions.ts` | pure module (constants/business logic) | transform (no I/O) | New domain — badge threshold/definition constants have no existing analog; implemented directly from RESEARCH.md's §Open Questions resolutions and CONTEXT.md D-16..D-19 in 69-01 Task 2. |

## Metadata

**Analog search scope:** `convex/tables/`, `convex/profiles/`, `convex/home/`, `convex/meals/`, `convex/meals/analyze/`, `convex/nutrition/`, `convex/schema.ts`, `components/home/`, `components/weight/`, `components/onboarding/steps/basics/`, `components/settings/`, `components/ui/`, `app/app/(settings)/`, `app/app/(home)/`, `app/app/(tabs)/`, `scripts/`
**Files scanned:** 21 read in full (all ≤ 301 lines — no offset/limit targeted reads needed), plus 2 grep-only checks (`Switch` usage — zero matches; `cron` usage — zero matches)
**Pattern extraction date:** 2026-08-30
