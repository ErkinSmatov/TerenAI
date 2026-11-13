# Phase 78: Подтверждаемое наблюдение - Pattern Map

**Mapped:** 2026-11-13
**Files analyzed:** 27 (новые и изменяемые)
**Analogs found:** 26 / 27

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `convex/tables/observerLinks.ts` (mod) | model | CRUD | сам файл + `convex/tables/pushTokens.ts` | exact |
| `convex/tables/doctors.ts` (new) | model | CRUD | `convex/tables/pushTokens.ts` | exact |
| `convex/schema.ts` (mod) | config | - | сам файл (строки 11-27) | exact |
| `convex/migrations.ts` (mod) | migration | batch | `backfillMealEatenAt` в нём же | exact |
| `convex/crons.ts` (mod) | config | batch | `check scheduled pushes` в нём же | exact |
| `lib/observers/linkStatus.ts` (new) | utility | transform | `lib/notifications/pushRules.ts` / `pushCatalog.ts` (чистые модули) | role-match |
| `convex/utils/observerAuth.ts` (mod) | middleware | request-response | сам файл | exact |
| `convex/observers/utils/pairLinks.ts` (new) | utility | CRUD | цикл `pairLinks` в `revokeLink.ts` | role-match |
| `convex/observers/redeemCode.ts` (mod) | controller (mutation) | request-response | сам файл | exact |
| `convex/observers/revokeLink.ts` (mod) | controller (mutation) | CRUD | сам файл | exact |
| `convex/observers/respondToRequest.ts` (new) | controller (mutation) | request-response | `convex/observers/revokeLink.ts` | exact |
| `convex/observers/cancelRequest.ts` (new, либо ветка revokeLink) | controller (mutation) | request-response | `convex/observers/revokeLink.ts` | exact |
| `convex/observers/getIncomingRequests.ts` (new) | controller (query) | CRUD | `convex/observers/getMyObservers.ts` | exact |
| `convex/observers/getMyObservers.ts` (mod) | controller (query) | CRUD | сам файл | exact |
| `convex/observers/getObservedPatients.ts` (mod) | controller (query) | CRUD | сам файл | exact |
| `convex/observers/getPatientToday.ts`, `getPatientHistory.ts` (проверка) | controller (query) | request-response | `observerAuth.ts` (вызов шлюза) | exact |
| `convex/observers/expirePendingLinks.ts` (new) | service (internalMutation) | batch | `convex/notifications/checkScheduledPushes.ts` | role-match |
| `convex/doctors/createDoctor.ts` (new) | controller (internalMutation) | CRUD | `checkScheduledPushes.ts` (internal) + `getMyObservers` | partial |
| `convex/users/deleteUser.ts` (mod) | service | CRUD | сам файл (строки 106-128) | exact |
| `lib/notifications/pushCatalog.ts` (mod) | config | transform | сам файл | exact |
| `convex/notifications/checkScheduledPushes.ts` (mod) | service | batch | сам файл (смена типа на `ScheduledPushId`) | exact |
| `scripts/verifyPushRules.ts` (mod) | test | transform | сам файл (строки 300-322) | exact |
| `scripts/verifyLinkStatus.ts` + `package.json` (new) | test | transform | `scripts/verifyPushRules.ts` | exact |
| `scripts/checks/observerGate.check.mjs` (new) | test | file-I/O | `scripts/checks/pushConfig.check.mjs` | exact |
| `components/notifications/NotificationsProvider.tsx` (mod) | provider | event-driven | сам файл (строки 136-142) | exact |
| `components/home/HomeHeader.tsx` (mod) | component | request-response | сам файл | exact |
| `components/observer/ObservationRequestSheet.tsx` (new) | component | event-driven | `components/ui/BottomSheet.tsx` + `ObserverCard.tsx` | role-match |
| `components/observer/IncomingRequestCard.tsx`, `PendingObservedCard.tsx` (new) | component | request-response | `components/observer/ObserverCard.tsx` | exact |
| `components/observer/ObservedPatientCard.tsx` (mod, тип) | component | request-response | сам файл | exact |
| `app/app/(tabs)/maps.tsx` (mod) | component (screen) | request-response | сам файл | exact |

## Pattern Assignments

### `convex/tables/observerLinks.ts` и `convex/tables/doctors.ts` (model, CRUD)

**Analog:** `convex/tables/pushTokens.ts` (поля в экспортируемом объекте + `defineTable().index()`), текущий `observerLinks.ts` строки 1-12.

```typescript
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

Применение: добавить `v.optional(...)` поля из RESEARCH (шаг 1 двухшаговой схемы) и индекс `byStatusAndRequestedAt`. `doctors` оформить так же: `doctorsFields` + `defineTable(doctorsFields).index("byUserId", ["userId"])`; подключить в `convex/schema.ts` по образцу строк `import { pushTokens } from "./tables/pushTokens";` (стр. 13) и записи в `defineSchema` (стр. 25-27).

---

### `convex/migrations.ts` (migration, batch)

**Analog:** `backfillMealEatenAt` (строки 8-15, комментарий запуска 17-24).

```typescript
export const backfillMealEatenAt = migrations.define({
  table: "meals",
  migrateOne: (_ctx, meal) => {
    if (meal.eatenAt === undefined) return { eatenAt: meal._creationTime };
  },
});
```

Применение: `backfillObserverLinkStatus` с `table: "observerLinks"`, условие `link.status === undefined`, возврат `{ status: "active" as const, confirmedAt: link._creationTime, requestedAt: link._creationTime }`. Дописать блок команд запуска (dryRun, реальный, `lib:getStatus`, `--prod`) в тот же комментарий.

---

### `convex/crons.ts` (config, batch) и `convex/observers/expirePendingLinks.ts` (internalMutation)

**Analog:** `convex/crons.ts` строки 12-16.

```typescript
crons.interval(
  "check scheduled pushes",
  { minutes: 30 },
  internal.notifications.checkScheduledPushes.default
);
```

Применение: добавить `crons.interval("expire pending observer links", { hours: 1 }, internal.observers.expirePendingLinks.default)` с русским комментарием про выбор интервала. Тело `expirePendingLinks` строить по `checkScheduledPushes.ts`: `internalMutation`, `try/catch` с `logError("... error", error)` и `return null`; продолжение пачки через `ctx.scheduler.runAfter(0, internal.observers.expirePendingLinks.default, {})` (тот же вызов, что в `checkScheduledPushes.ts` ~стр. 290: `ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification.default, { messages })`). Шапку файла (импорты internalMutation, logError) взять из `checkScheduledPushes.ts` строки 1-30 (в этом отчёте не прочитаны; планировщику открыть начало файла).

---

### `convex/utils/observerAuth.ts` (middleware, request-response)

**Analog:** сам файл, строки 16-32. Менять только блок поиска связи:

```typescript
const observerId = await getAuthUserId(ctx);
if (observerId === null) throw new Error("Unauthorized");

const link = await ctx.db
  .query("observerLinks")
  .withIndex("byObserverAndPatient", (q) =>
    q.eq("observerId", observerId).eq("patientId", targetUserId)
  )
  .first();
if (!link) throw new Error("Forbidden");
return observerId;
```

Заменить `.first()` на `.collect()` и `if (!links.some(isActiveLink)) throw new Error("Forbidden");` (`isActiveLink` из `@/lib/observers/linkStatus`). Сохранить сигнатуру, ошибки `Unauthorized`/`Forbidden` и шапочный комментарий (он описывает контракт шлюза; дополнить строкой про `active`).

---

### `convex/observers/redeemCode.ts` (mutation, request-response)

**Analog:** сам файл. Сохранить порядок: auth -> `CODE_FORMAT` -> два `rateLimiter.limit` -> поиск профиля (строки 16-45). Менять хвост (строки 50-58):

```typescript
const existingLink = await ctx.db
  .query("observerLinks")
  .withIndex("byObserverAndPatient", (q) =>
    q.eq("observerId", observerId).eq("patientId", patientId)
  )
  .first();
if (existingLink) return existingLink._id; // идемпотентно

return await ctx.db.insert("observerLinks", { observerId, patientId });
```

Применение: `.collect()` по паре, выбор эффективной строки через `pairLinks`, переход по автомату (`canTransition`), insert/patch в `pending` с `requestedAt`. Возврат `{ linkId, status }` (тип `Promise<Id<"observerLinks">>` в строке 14 заменить). Ошибки как существующие: `throw new Error("Code not found")`, для declined < 24ч `throw new Error("Request not accepted")`. `catch` оставить: `logError("redeemCode error", error); throw error;`. Push OBS-01: читать `pushTokens` по `byUserId`, отправлять через `ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification.default, { messages })`; формат message как в `checkScheduledPushes.ts` (`{ expoPushToken, title, body, data: { url } }`), для тихих часов использовать `isQuietHours` из `@/lib/notifications/pushRules` (сигнатура `isQuietHours(nowUtcMs, timezoneOffsetMinutes)`, см. `scripts/verifyPushRules.ts` стр. 34).

---

### `convex/observers/revokeLink.ts`, `respondToRequest.ts`, `cancelRequest.ts` (mutation, request-response)

**Analog:** `convex/observers/revokeLink.ts` строки 1-43. Каркас для всех трёх.

```typescript
const callerId = await getAuthUserId(ctx);
if (callerId === null) throw new Error("Unauthorized");

const link = await ctx.db.get(linkId);
if (!link) return null;

if (link.observerId !== callerId && link.patientId !== callerId) {
  throw new Error("Forbidden");
}

const pairLinks = await ctx.db
  .query("observerLinks")
  .withIndex("byObserverAndPatient", (q) =>
    q.eq("observerId", link.observerId).eq("patientId", link.patientId)
  )
  .collect();
for (const duplicate of pairLinks) {
  await ctx.db.delete(duplicate._id);   // -> заменить на ctx.db.patch(duplicate._id, {...})
}
return null;
// catch: logError("revokeLink error", error); throw error;
```

Применение: `db.delete` заменить на `db.patch` со статусом (`revoked`, `endedBy` по роли вызывающего). `respondToRequest`: args `{ linkId: v.id("observerLinks"), decision: v.union(v.literal("accept"), v.literal("decline")) }`, дополнительная проверка `link.patientId === callerId` (иначе `Forbidden`), идентичность только из `getAuthUserId`. Обновить комментарий про дубликаты (он больше не про delete).

---

### `convex/observers/getMyObservers.ts` и `getIncomingRequests.ts` (query, CRUD)

**Analog:** `getMyObservers.ts` строки 5-47.

```typescript
const userId = await getAuthUserId(ctx);
if (userId === null) throw new Error("Unauthorized");

const links = await ctx.db
  .query("observerLinks")
  .withIndex("byPatientId", (q) => q.eq("patientId", userId))
  .collect();

const resolved = await Promise.all(
  links.map(async (link) => {
    const observer = await ctx.db.get(link.observerId);
    if (!observer) return null;
    const displayName =
      [observer.name, observer.email, observer.phone].find(
        (value): value is string => Boolean(value)
      ) ?? "Гость";
    return { linkId: link._id, observerId: link.observerId, displayName, linkedAt: link._creationTime };
  })
);
return resolved
  .filter((observer): observer is NonNullable<typeof observer> => observer !== null)
  .sort((a, b) => b.linkedAt - a.linkedAt);
```

Применение: `getMyObservers` фильтрует `isActiveLink`, `linkedAt` брать из `confirmedAt ?? _creationTime`, дедуп по `observerId`, добавить `doctor: { clinic } | null` через `resolveDoctorBadge` (чистая функция в `lib/observers/linkStatus.ts`, `clinic` только при `verified`) и запрос `doctors` по `byUserId`. `getIncomingRequests` — копия с фильтром `status === "pending"` и полем `requestedAt`. Кросс-пользовательский шлюз не нужен (своя сторона связи), как сказано в комментарии строки 12-14; сохранить этот комментарий.

---

### `convex/observers/getObservedPatients.ts` (query, CRUD)

**Analog:** сам файл. Ключевое место (строки 58-60), которое нужно перестроить, чтобы `pending` не читал пациента:

```typescript
for (const link of links) {
  const patient = await ctx.db.get(link.patientId);
  if (!patient) continue; // связь с несуществующим пациентом — пропускаем
```

Применение: первой строкой цикла ветка по статусу: `pending` -> `results.push({ status: "pending", linkId, requestedAt })` и `continue` до `ctx.db.get`; не `active` (declined/revoked/expired) -> `continue`; legacy без статуса обрабатывать `isActiveLink`. Тип `results` (строки 37-56) стать дискриминированным объединением; финальный `map(({ _creationTime, ...rest }) => rest)` (стр. 149) сохранить с учётом сортировки. Обновить тип `ObservedPatient` в `ObservedPatientCard.tsx` в той же задаче.

---

### `convex/users/deleteUser.ts` (service, CRUD)

**Analog:** строки 106-128 (физическое удаление обеих сторон + `pushTokens`).

```typescript
const pushTokens = await ctx.db
  .query("pushTokens")
  .withIndex("byUserId", (q) => q.eq("userId", userId))
  .collect();
for (const token of pushTokens) {
  await ctx.db.delete(token._id);
}
```

Применение: добавить аналогичный блок для `doctors` (`byUserId`) перед `ctx.db.delete(userId)`. Блоки `observerLinks` не менять.

---

### `lib/notifications/pushCatalog.ts` и `checkScheduledPushes.ts` (config / service)

**Analog:** `pushCatalog.ts` строки 8-25.

```typescript
export type PushId = "FOOD-01" | "HLT-14" | "RET-01" | "RET-02" | "RET-03";

export const PUSH_CATALOG: Record<
  PushId,
  { pushClass: PushClass; title: string; texts: string[]; url: string }
> = {
  // Класс B (расписание) — в лимит C/D не входит.
  "FOOD-01": { pushClass: "B", title: "Всё в порядке?", texts: [...], url: "/app" },
```

Применение: `export type ScheduledPushId = "FOOD-01" | ...; export type PushId = ScheduledPushId | "OBS-01";` и запись `"OBS-01"` класса `A` (текст и url из RESEARCH). Класс `A` уже должен входить в тип `PushClass` в `lib/notifications/pushRules.ts` (планировщику проверить; в этом отчёте файл не открывался). В `checkScheduledPushes.ts` заменить `PushId` на `ScheduledPushId` в 4 местах: импорт (стр. 28), `counts: Record<PushId, number>` (стр. 66), `renderChecked(id: PushId...)` (стр. 101), `countsTowardLimit`/`limitedOk` (стр. 126-128), `as PushId` (стр. 265).

---

### `scripts/verifyLinkStatus.ts` (test, transform) и `scripts/verifyPushRules.ts` (mod)

**Analog:** `scripts/verifyPushRules.ts` строки 1-21 и 300-322.

```typescript
import assert from "node:assert/strict";
import { PUSH_CATALOG, type PushId } from "@/lib/notifications/pushCatalog";
// ...
for (const id of Object.keys(PUSH_CATALOG) as PushId[]) {
  const entry = PUSH_CATALOG[id];
  // validatePushCopy ...
}
assert.strictEqual(PUSH_CATALOG["RET-03"].pushClass, "D");
```

npm-скрипт по образцу `package.json` стр. 30: `"script:verifyLinkStatus": "ts-node -r tsconfig-paths/register scripts/verifyLinkStatus.ts"` (без TZ, если модуль не зависит от часового пояса). В `verifyPushRules.ts` добавить `assert.strictEqual(PUSH_CATALOG["OBS-01"].pushClass, "A")` после строки 322.

---

### `scripts/checks/observerGate.check.mjs` (test, file-I/O)

**Analog:** `scripts/checks/pushConfig.check.mjs` (статическая проверка исходников).

```javascript
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const read = (p) => readFileSync(p, "utf8");
const appConfig = read("app.config.ts");
assert.ok(appConfig.includes('"expo-notifications"'), "app.config.ts: плагин ... не подключён");
```

Применение: прочитать `convex/utils/observerAuth.ts` (assert на `isActiveLink`/`active`) и `getObservedPatients.ts` (индекс `status` проверяется раньше `ctx.db.get(link.patientId)`); сообщения об ошибках по-русски.

---

### `components/notifications/NotificationsProvider.tsx` (provider, event-driven)

**Analog:** строки 136-142.

```typescript
const navigateFromNotificationUrl = (url: unknown) => {
  if (url === "/app/(settings)/weeklyWeighIn") {
    router.push("/app/(settings)/weeklyWeighIn");
  } else {
    router.push("/app");
  }
};
```

Применение: добавить ветку `else if (url === "/app/(tabs)/maps") router.push("/app/(tabs)/maps");` строго по белому списку.

---

### `components/home/HomeHeader.tsx` (component)

**Analog:** сам файл, `iconGroup` (стр. 31-52) и кнопка с `router.push`.

```tsx
<View style={styles.iconGroup}>
  <Button variant="base" size="base" accessibilityLabel="Открыть серию и календарь"
    onPress={() => { router.push("/app/(home)/streak"); }}>
    <Pill style={styles.streakContainer}> ... </Pill>
  </Button>
</View>
```

Применение: перед серией добавить `Button` с иконкой (`EyeIcon`/`UsersIcon` из `lucide-react-native`, как импортирован `FlameIcon`), `router.push("/app/(tabs)/maps")`, бейдж-число из `useQuery(api.observers.getIncomingRequests.default)`. Цвета через `getColor(name, undefined, theme)`, стили в `createStyles = (_theme: ThemeName) => ({...})` с `as const` для enum-значений; `accessibilityLabel` по-русски.

---

### `components/observer/IncomingRequestCard.tsx`, `PendingObservedCard.tsx` (component)

**Analog:** `components/observer/ObserverCard.tsx` строки 1-76 (карточка, `AlertDialog` для деструктивного действия, `useThemedStyles`, `getNutrientGlow`, `CARD_BACKGROUND_DARK`).

```tsx
import { CARD_BACKGROUND_DARK, CARD_GLOW } from "./observerCardTheme";
const { theme } = useThemeContext();
const styles = useThemedStyles(createStyles);
<View style={[styles.card, getNutrientGlow(theme, CARD_GLOW.dark, CARD_GLOW.light)]}>
...
<AlertDialog trigger={<Button variant="base" size="base" accessibilityLabel="Отозвать доступ">...</Button>}
  destructive title="Отозвать доступ" description="..." onConfirm={onRevoke} />
```

Применение: `PendingObservedCard` — без имени, текст «Запрос отправлен, ожидает подтверждения», кнопка отмены через `AlertDialog` (D-07). `IncomingRequestCard` — `displayName`, пометка `Врач · {clinic}` при `doctor`, кнопки «Разрешить»/«Отклонить». Блок стилей `createStyles = (theme: ThemeName) => ({...}) as const` (стр. 78-90).

---

### `components/observer/ObservationRequestSheet.tsx` (component, event-driven)

**Analog:** `components/ui/BottomSheet.tsx` (props `Trigger?`, `children`, `ref?: Ref<BottomSheetModal>`; открытие через `ref.current?.present()`). Провайдер уже в `RootLayoutProvider`.

```tsx
type Props = { Trigger?: React.ReactElement<{ onPress?: () => void }>; children: React.ReactNode; ref?: React.Ref<BottomSheetModal>; };
```

Применение: компонент держит `useRef<BottomSheetModal>`, `useRef<Set<string>>` показанных `linkId`; `present()` при появлении нового pending из `getIncomingRequests`; внутри список `IncomingRequestCard` (D-04). Монтировать в `app/app/_layout.tsx` или `(tabs)/index.tsx` (планировщик выбирает, файл не читался).

---

### `app/app/(tabs)/maps.tsx` (screen)

**Analog:** сам файл. Затрагиваемые места:
- Хуки (стр. 58-63): `useQuery(api.observers.getObservedPatients.default, { timezoneOffsetMinutes: new Date().getTimezoneOffset() })`, `useMutation(api.observers.redeemCode.default)`, `revokeLink`; добавить `getIncomingRequests`, `respondToRequest`.
- `handleFilled` (стр. 68-98) — маппинг ошибок по `message.includes(...)`:

```tsx
if (message.includes("Code not found")) {
  Toast.show({ text: "Код не найден. Проверьте и попробуйте снова.", variant: "error" });
} else if (message.includes("Cannot observe yourself")) { ... }
```

Добавить ветку `message.includes("Request not accepted")` -> «Запрос не принят.» и обработку нового возврата `{ linkId, status }` (Toast «Запрос отправлен» вместо перехода).
- Список наблюдаемых (стр. 144-150): `patients.map(item => <ObservedPatientCard key={item.linkId} .../>)` — ветвление по `item.status === "pending"` -> `PendingObservedCard`.
- Блок «Запросы на наблюдение» вставить перед `<View style={styles.tabs}>` (стр. ~129).
Тексты в Toast без деталей сервера, как сейчас.

## Shared Patterns

### Обработка ошибок и логирование
**Source:** `convex/observers/revokeLink.ts` стр. 38-41, `redeemCode.ts` стр. 59-62
**Apply to:** все новые и изменяемые Convex-функции
```typescript
} catch (error) {
  logError("revokeLink error", error);
  throw error;
}
```
Импорт: `import logError from "@/lib/utils/logError";`. Секреты и коды не логировать.

### Аутентификация и IDOR
**Source:** `revokeLink.ts` стр. 10-21; `observerAuth.ts` стр. 20-21
**Apply to:** все мутации/запросы observers
```typescript
const callerId = await getAuthUserId(ctx);
if (callerId === null) throw new Error("Unauthorized");
```
Личность только из сессии; `observerId`/`patientId` не принимать аргументами; участие и роль проверять по строке связи. Чтение данных пациента (getPatientToday, getPatientHistory) начинать с `assertObserverAccess`.

### Операции над всей парой
**Source:** `revokeLink.ts` стр. 28-37
**Apply to:** `redeemCode`, `respondToRequest`, `revokeLink`, `cancelRequest`, `getMyObservers` (дедуп)
`withIndex("byObserverAndPatient", ...).collect()` и применять изменение ко всем строкам. Вынести в `convex/observers/utils/pairLinks.ts` (соседний `utils/thresholds` уже есть в `convex/observers/utils/`).

### Тематизация UI (Phase 76)
**Source:** `ObserverCard.tsx`, `HomeHeader.tsx`
**Apply to:** все новые компоненты
`const { theme } = useThemeContext(); const styles = useThemedStyles(createStyles);` и `getColor("...", undefined, theme)`; `createStyles = (theme: ThemeName) => ({...})`.

### Отправка push из мутации
**Source:** `convex/notifications/checkScheduledPushes.ts` стр. 284-290
**Apply to:** `redeemCode` (OBS-01)
```typescript
await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification.default, { messages });
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `convex/doctors/createDoctor.ts` | internalMutation | CRUD | В `convex/` нет internalMutation с ручным вызовом через `npx convex run`; использовать форму `internalMutation({ args, handler })` из `convex/_generated/server` по образцу `checkScheduledPushes.ts` и RESEARCH |

## Metadata

**Analog search scope:** `convex/observers`, `convex/utils`, `convex/tables`, `convex/notifications`, `convex/users`, `lib/notifications`, `scripts`, `scripts/checks`, `components/observer`, `components/home`, `components/ui/BottomSheet.tsx`, `components/notifications`, `app/app/(tabs)/maps.tsx`
**Files scanned:** ~25 (не читались целиком: `getPatientToday.ts`, `getPatientHistory.ts`, `regenerateCode.ts`, `generateCode.ts`, `pushRules.ts`, `app/app/_layout.tsx`, начало `checkScheduledPushes.ts`; планировщику сверить)
**Pattern extraction date:** 2026-11-13
