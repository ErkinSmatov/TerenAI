# Phase 78: Подтверждаемое наблюдение (бэкенд и приложение) - Research

**Researched:** 2026-11-13
**Domain:** Convex (схема, миграция, cron, push) + Expo Router UI, жизненный цикл связи observerLinks
**Confidence:** HIGH (весь код прочитан в репозитории; внешних библиотек нет)

## Summary

Фаза целиком внутренняя: новых пакетов не требуется. Всё нужное уже стоит в проекте: `@convex-dev/migrations ^0.3.0`, `@convex-dev/rate-limiter`, `sendPushNotification`, `crons`, `BottomSheet` (gorhom, провайдер уже в `RootLayoutProvider`). Ядро работы: добавить `status` в `observerLinks`, сменить единственный шлюз `assertObserverAccess` на «только active», переписать `redeemCode` и `revokeLink` как конечный автомат, добавить мутации ответа пациента, cron истечения и таблицу `doctors`.

Главные риски: (1) порядок выкатки схемы и миграции (существующие документы без `status` ломают деплой, если поле обязательное); (2) `PushId` жёстко связан с `Record<PushId, number>` в `checkScheduledPushes` и циклом в `verifyPushRules`; (3) утечка данных пациента через `getObservedPatients` для `pending` (сейчас запрос читает пациента до любой проверки); (4) расхождения CONTEXT.md с кодом (см. «Расхождения»).

**Primary recommendation:** двухшаговая схема (шаг 1: `status` optional + хелпер `isActiveLink`, где отсутствие статуса считается legacy-active; миграция; шаг 2: `status` обязателен, хелпер строгий), `assertObserverAccess` через `collect()` по паре и `some(status==="active")`, одна строка на пару с перепатчиванием статуса, отдельные мутации `respondToRequest` / `revokeLink` / `cancel` в одном файле-автомате на основе чистого модуля `lib/observers/linkStatus.ts` (тестируется verify-скриптом).

## Расхождения CONTEXT.md с реальным кодом [VERIFIED: codebase grep]

- `HomeHeader.tsx` НЕ содержит кнопки наблюдения (только пилюля серии с `router.push("/app/(home)/streak")`). Иконку с бейджем надо ДОБАВИТЬ в `iconGroup`, а не «повесить onPress». Раздел наблюдения живёт во вкладке `app/app/(tabs)/maps.tsx` (заголовок «Карты»).
- `getCurrentUserName.ts` observerLinks не использует (упоминание только в комментарии). Менять не нужно.
- Список файлов, трогающих `observerLinks`: `convex/schema.ts`, `tables/observerLinks.ts`, `utils/observerAuth.ts`, `observers/{getMyObservers,getObservedPatients,getPatientToday,getPatientHistory,redeemCode,revokeLink,regenerateCode}.ts`, `users/deleteUser.ts`, `app/app/(tabs)/maps.tsx`, `components/observer/ObservedPatientCard.tsx` (тип `ObservedPatient`).
- Экран детали `app/app/(settings)/observedPatient/[patientId].tsx` уже экспортирует `ErrorBoundary`, рассчитанный на `Forbidden` при отзыве, пока экран открыт. Отзыв «сразу» (SC3) уже закрыт реактивностью Convex + этим boundary; проверить, что `pending/revoked` дают тот же `Forbidden`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Три канала сразу: push, бейдж на иконке наблюдения в `HomeHeader`, модальное окно при открытии приложения. Согласие нельзя пропустить незамеченным.
- **D-02:** Push отправляется через существующий `convex/notifications/sendPushNotification.ts` и `pushTokens`. В `lib/notifications/pushCatalog.ts` добавляется новый тип (отдельный класс; он транзакционный и не входит в лимиты C/D и тумблеры напоминаний). Нужен ответ планировщику: как тип встраивается в `PushId`/`PUSH_CATALOG` и не ломает `verifyPushRules`.
- **D-03:** Блок «Запросы на наблюдение» живёт в том же разделе, где код пациента и список наблюдателей (сейчас это `app/app/(tabs)/maps.tsx` с `ShareCodeCard`, `ObserverCard`). При новом запросе на главной всплывает bottom-sheet с кнопками «Разрешить» и «Отклонить».
- **D-04:** Несколько запросов одновременно показываются списком, каждый подтверждается отдельно.
- **D-05:** Карточка-заглушка «Запрос отправлен, ожидает подтверждения» без имени, email и телефона пациента. Имя показывается только после `active`. Причина: код из 5 цифр можно подобрать, и по нему нельзя раскрывать личность.
- **D-06:** `getObservedPatients` не читает данные пациента для `pending`. Возвращает только заглушку (`linkId`, `status`, время).
- **D-07:** Наблюдатель может отменить свой неподтверждённый запрос в любой момент.
- **D-08:** `pending` без ответа 14 дней автоматически становится `expired` (cron в `convex/crons.ts`, по образцу `checkScheduledPushes`).

### Claude's Discretion (зафиксировано как рабочее решение)
- **D-09:** Статусы хранятся, а не удаляются: `pending`, `active`, `declined`, `revoked`, `expired`. Это нужно для аудита и для запрета спама. Это меняет текущее поведение `revokeLink` (сейчас физическое удаление всех строк пары), учесть дубликаты пары из-за check-then-insert.
- **D-10:** После `declined` повторный запрос того же наблюдателя блокируется на 24 часа. Ответ без раскрытия, что пациент отклонил (наблюдатель видит нейтральное «запрос не принят»).
- **D-11:** В Фазе 78 создаётся минимальная таблица `doctors` (`userId`, ФИО, клиника, `status: pending | verified`), заводится вручную через internal-мутацию. Расширение — Фаза 80. Пометка «Врач · Клиника» выводится только при `status = verified`.
- **D-12:** Объём доступа при подтверждении — целиком, без выбора категорий.
- **D-13:** Миграция через `@convex-dev/migrations`: все существующие `observerLinks` получают `status = active`, `confirmedAt = _creationTime`.
- Решено ранее (Phase 6): код постоянный и многоразовый; много-ко-многим; отзыв с обеих сторон; единственный шлюз — `assertObserverAccess`.

### Deferred Ideas (OUT OF SCOPE)
- Выбор категорий данных при подтверждении (Фазы 79, 82).
- Приглашения врача: QR, ссылка, Install Referrer, короткий код iOS (Фаза 81).
- Журнал доступа наблюдателей (Фаза 79).
- Блокировка наблюдателя пациентом навсегда.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LINK-01 | Связь создаётся `pending`; наблюдатель не получает данных до подтверждения | `redeemCode` → pending; `assertObserverAccess` только active; `getObservedPatients` возвращает заглушку без чтения пациента |
| LINK-02 | Пациент видит запрос, подтверждает/отклоняет | `getIncomingRequests`, `respondToRequest`, bottom-sheet + блок в maps.tsx, push, бейдж |
| LINK-03 | Отзыв в любой момент, доступ прекращается сразу | `revokeLink` → status `revoked` для всех строк пары; реактивность Convex + существующий ErrorBoundary |
| LINK-04 | Существующие связи → `active` | `migrations.define` + двухшаговая выкатка схемы |
| LINK-05 | «Врач · Клиника» только для verified | таблица `doctors`, join на сервере в `getMyObservers`/`getIncomingRequests` |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Контроль доступа (только active) | API / Backend (`assertObserverAccess`) | — | единственный шлюз BOLA, клиенту не доверяем |
| Автомат статусов (pending/active/…) | API / Backend (mutations) | Чистый модуль `lib/observers` | переходы и проверка участия на сервере |
| Пометка «Врач · Клиника» | API / Backend (join с `doctors`) | Browser (только отрисовка) | клиент не может её выставить |
| Автоистечение 14 дней | Backend (cron internalMutation) | — | нет клиента в цепочке |
| Уведомление пациента | Backend (scheduler → Expo Push) | Browser (бейдж, модалка, deep link) | три канала D-01 |
| Миграция legacy-связей | Database (`@convex-dev/migrations`) | — | разовая |

## Standard Stack

### Core (уже в проекте, новых пакетов нет)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| convex | ^1.27.3 | схема, мутации, cron | основа проекта [VERIFIED: package.json] |
| @convex-dev/migrations | ^0.3.0 | бэкфилл D-13 | уже используется (`backfillMealEatenAt`) [VERIFIED: convex/migrations.ts] |
| @convex-dev/rate-limiter | установлен | лимиты `observerCodeRedeem`/`observerCodeGuess` | остаются на `redeemCode` [VERIFIED: convex/rateLimit.ts] |
| @gorhom/bottom-sheet | установлен | модалка запроса | `components/ui/BottomSheet.tsx`, провайдер в `RootLayoutProvider` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Одна строка на пару с патчем статуса | Новая строка на каждый запрос | История полнее, но надо обрабатывать дубли в каждом запросе; D-09 просит «учесть дубликаты» — проще держать одну строку |

**Installation:** `npm install` не нужен. **Package Legitimacy Audit:** новых внешних пакетов нет, аудит не требуется.

## Architecture Patterns

### Диаграмма потока
```
Наблюдатель: код(5 цифр) -> redeemCode [rate limit x2] -> поиск профиля -> состояние пары?
   |-- нет строки / expired / revoked --> insert|patch status=pending, requestedAt=now
   |-- pending / active --> идемпотентный возврат
   |-- declined < 24ч --> ошибка нейтральная ("Request not accepted")
   v
 pending --(scheduler.runAfter 0)--> push OBS-01 -> пациент (тихие часы: пропуск push)
   |                                              Пациент: бейдж HomeHeader + BottomSheet + блок в maps.tsx
   |-- respondToRequest(accept) --> active (confirmedAt) --> assertObserverAccess пускает
   |-- respondToRequest(decline) --> declined (respondedAt)
   |-- наблюдатель cancel --> revoked(endedBy=observer)
   |-- cron hourly: pending старше 14 дней --> expired
 active --revokeLink (любая сторона)--> revoked  => getPatientToday бросает Forbidden => ErrorBoundary
```

### Рекомендуемая структура
```
lib/observers/linkStatus.ts      # чистый: типы статусов, константы (14 дней, 24 ч), canTransition, isActiveLink
convex/tables/observerLinks.ts   # + status, requestedAt, confirmedAt, respondedAt, endedBy, lastNotifiedAt
convex/tables/doctors.ts         # userId, fullName, clinic, status
convex/doctors/createDoctor.ts   # internalMutation (ручной ввод через npx convex run)
convex/observers/respondToRequest.ts, getIncomingRequests.ts, expirePendingLinks.ts (internal)
convex/observers/utils/pairLinks.ts   # загрузка всех строк пары + выбор "эффективной"
scripts/verifyLinkStatus.ts      # по образцу verifyPushRules, + npm script:verifyLinkStatus
components/observer/ObservationRequestSheet.tsx, PendingObservedCard.tsx, IncomingRequestCard.tsx
```

### Схема observerLinks (двухшаговая)
```ts
status: v.optional(v.union(v.literal("pending"), v.literal("active"),
  v.literal("declined"), v.literal("revoked"), v.literal("expired"))),
requestedAt: v.optional(v.number()), confirmedAt: v.optional(v.number()),
respondedAt: v.optional(v.number()), endedBy: v.optional(v.union(v.literal("patient"), v.literal("observer"))),
lastNotifiedAt: v.optional(v.number())
// индексы: byPatientId, byObserverId, byObserverAndPatient (остаются);
// добавить: byStatus ["status"]  (cron: .withIndex("byStatus", q => q.eq("status","pending").lt("_creationTime", cutoff)))
```
Замечание: для срока истечения надёжнее сравнивать `requestedAt` (перезапрос патчит строку, `_creationTime` не меняется). Поэтому индекс `byStatusAndRequestedAt ["status","requestedAt"]` предпочтительнее `byStatus`. [ASSUMED: Convex добавляет `_creationTime` последним полем любого индекса — задокументированное поведение, но в этой сессии не перепроверялось по docs.]

### Шлюз
```ts
// observerAuth.ts
const links = await ctx.db.query("observerLinks")
  .withIndex("byObserverAndPatient", q => q.eq("observerId", observerId).eq("patientId", targetUserId))
  .collect();
if (!links.some(isActiveLink)) throw new Error("Forbidden");
```
`isActiveLink`: шаг 1 — `status === "active" || status === undefined`; шаг 2 — строго `=== "active"`. Fail-closed для всех новых строк, т.к. каждая вставка задаёт `status`.

### Выкатка и миграция D-13
1. Деплой шага 1 (схема optional, код с legacy-хелпером). Доступ существующих не прерывается.
2. `npx convex run migrations:run '{"fn":"migrations:backfillObserverLinkStatus","dryRun":true}'`, затем реальный запуск, `--prod` для прода (формат — комментарий в `convex/migrations.ts`). Миграция идемпотентна: `if (link.status === undefined) return { status:"active", confirmedAt: link._creationTime, requestedAt: link._creationTime }`.
3. Проверить `lib:getStatus`, затем деплой шага 2 (status обязателен, хелпер строгий). Это два плана/коммита с checkpoint на запуск миграции человеком.

### Anti-Patterns
- Читать `ctx.db.get(link.patientId)` до проверки статуса в `getObservedPatients` (сейчас именно так, D-06 это запрещает).
- Фильтровать `active` в UI, а не на сервере.
- Принимать `observerId`/`patientId` аргументами в мутациях подтверждения: личность только из `getAuthUserId`, участие и роль проверять по строке.
- Различать «нет такого кода» и «отклонён» ответами (утечка), кроме согласованного нейтрального текста.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Бэкфилл | свой цикл по таблице | `migrations.define` | батчи, статус, dryRun |
| Периодика | setInterval/self-scheduling | `crons.interval` | образец `check scheduled pushes` |
| Лимиты | счётчики в таблице | `rateLimiter` (уже в `redeemCode`) | |
| Push | свой HTTP к Expo | `internal.notifications.sendPushNotification.default` через `ctx.scheduler.runAfter(0, …)` | токены, ретраи, receipts |
| Bottom sheet | свой модал | `components/ui/BottomSheet.tsx` (`ref.present()`) | |

## Детали по решениям

### Автомат переходов (по роли и статусу)
| Действие | Кто | Из | В |
|----------|-----|----|---|
| redeemCode | наблюдатель | нет / expired / revoked / declined(>24ч) | pending |
| respondToRequest accept | пациент | pending | active (`confirmedAt`) |
| respondToRequest decline | пациент | pending | declined (`respondedAt`) |
| revokeLink | пациент | active | revoked (`endedBy=patient`) |
| revokeLink / cancel | наблюдатель | pending или active | revoked (`endedBy=observer`) |
| cron | система | pending, `requestedAt` < now-14д | expired |
Любой другой переход: no-op либо `Forbidden`. Все мутации применяют изменение ко ВСЕМ строкам пары (дубликаты). Проверка участия по обеим ролям остаётся обязательной (IDOR). Подтверждение: только `link.patientId === callerId`.

### Нюансы redeemCode
- Возвращать нужно не только id, а `{ linkId, status }`, чтобы UI показал «ожидает» вместо перехода на карточку. Менять тип возврата — править `maps.tsx` (`handleFilled`).
- D-10: на `declined` < 24ч бросать нейтральную ошибку (`"Request not accepted"`), UI маппит её в текст «Запрос не принят». Не использовать слово declined в тексте.
- Rate limiters стоят до поиска профиля: сохранить порядок. Дедуп push: слать уведомление, только если `lastNotifiedAt` пуст или старше 24 ч (защита от спама через cancel + повторный ввод).
- Мутации Convex сериализуемы (OCC), поэтому check-then-insert внутри одной мутации обычно безопасен; всё равно оставить `collect()` по паре как защиту от легаси-дублей [ASSUMED].
- Открытый вопрос: после `revoked` самим пациентом разрешать немедленный перезапрос? Рекомендация: разрешить (всё равно нужно подтверждение), а cooldown 24 ч применить также к `revoked` с `endedBy=patient` НЕ делать, пока пользователь не решит.

### getObservedPatients
Результат становится дискриминированным объединением: `{ status:"pending", linkId, requestedAt }` или полная карточка с `status:"active"`. Для `declined/revoked/expired` строка не возвращается (наблюдатель видит «ничего»). Тип `ObservedPatient` в `ObservedPatientCard.tsx` и `maps.tsx` менять в той же задаче, иначе tsc упадёт. Ветка pending не должна вызывать `ctx.db.get(patientId)`.

### getMyObservers / getIncomingRequests
`getMyObservers` — только `active`, плюс `doctor: { clinic } | null`. Новый `getIncomingRequests` — `pending` для patientId (имя, `requestedAt`, `doctor`). Бейдж = длина списка (отдельный лёгкий запрос не обязателен при малых объёмах). Дедуп дублей пары по `observerId`. Вычислять `doctor` так: запрос в `doctors` по индексу `byUserId`, возвращать `clinic` только при `status==="verified"`; `status`/ФИО наружу не отдавать лишнего. Пометка «Врач · <клиника>» собирается на клиенте из серверного поля.

### Push (ответ на вопрос из D-02)
- `PushId` сейчас — union из 5 значений; `checkScheduledPushes` держит `Record<PushId, number>` (тогда tsc потребует новое ключ) и `verifyPushRules` итерирует `Object.keys(PUSH_CATALOG)`, валидируя каждый текст через `validatePushCopy`.
- Решение: ввести `ScheduledPushId = "FOOD-01"|"HLT-14"|"RET-01"|"RET-02"|"RET-03"` и `PushId = ScheduledPushId | "OBS-01"`; `checkScheduledPushes` перевести на `ScheduledPushId` (3 места: импорт, `counts`, `countsTowardLimit`/`limitedOk`/`renderChecked`/`id as PushId`). Каталог: `"OBS-01": { pushClass: "A", title: "Запрос на наблюдение", texts: ["Кто-то хочет наблюдать за вашими данными. Откройте приложение, чтобы ответить 🔔"], url: "/app/(tabs)/maps" }`. Класс `A` не входит в `LIMITED_PUSH_CLASSES` (C, D), значит, лимит 3 и тумблеры его не касаются; `verifyPushRules` пройдёт, если копирайт удовлетворяет правилам 9–10 (≤40 / ≤140 символов, ровно одно эмодзи в конце, в заголовке эмодзи нет). Добавить в `verifyPushRules` assert `PUSH_CATALOG["OBS-01"].pushClass === "A"`.
- Имя наблюдателя в тексте push НЕ включать: экран блокировки + медицинский контекст + ограничение «одно эмодзи» и длина.
- `checkScheduledPushes` читает все `pushTokens` и шлёт по расписанию; `OBS-01` отправляется ИЗ мутации `redeemCode`: прочитать `pushTokens` пациента (`byUserId`), собрать `messages` и `ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification.default, { messages })` (как делает `checkScheduledPushes`). Тихие часы (правило 3): рекомендуется пропускать push в 22:00–08:00 по `token.timezoneOffsetMinutes`; бейдж и модалка всё равно сработают. [ASSUMED: пользователь не обсуждал тихие часы для транзакционного push. Спросить.]
- Deep link: `NotificationsProvider.navigateFromNotificationUrl` знает только `weeklyWeighIn`, иначе `/app`. Добавить ветку `"/app/(tabs)/maps"` (ТОЛЬКО эту, без произвольного `router.push(url)` — URL приходит извне).

### Cron
`crons.interval("expire pending observer links", { hours: 1 }, internal.observers.expirePendingLinks.default)`. Мутация берёт `.take(200)` по индексу, патчит в `expired`; если взято ровно 200 — `ctx.scheduler.runAfter(0, …)` продолжение. Константа 14 дней из `lib/observers/linkStatus.ts`.

### doctors
```ts
doctors: defineTable({ userId: v.id("users"), fullName: v.string(), clinic: v.string(),
  status: v.union(v.literal("pending"), v.literal("verified")) }).index("byUserId", ["userId"])
```
`createDoctor` — `internalMutation` (недоступна клиенту; вызов `npx convex run doctors/createDoctor:default '{...}'`). `deleteUser.ts` должен удалять строку `doctors` пользователя (иначе висячая ссылка). Добавить таблицу в `convex/schema.ts`.

### deleteUser
Текущая физическая очистка обеих сторон `observerLinks` остаётся корректной (удаление аккаунта удаляет всё). Не менять на статусы.

### UI
- `HomeHeader`: добавить кнопку (например `EyeIcon`/`UsersIcon` из lucide) с бейджем-числом в `iconGroup`; `router.push("/app/(tabs)/maps")`. Данные: `useQuery(api.observers.getIncomingRequests.default)`.
- Модалка при открытии: смонтировать `ObservationRequestSheet` на верхнем уровне экранов приложения (`app/app/_layout.tsx` или главная `(tabs)/index.tsx`), показывать при появлении pending-запроса, который ещё не закрыт в этой сессии (держать `Set` идентификаторов в `useRef`), иначе после «закрыть» она будет всплывать при каждом ререндере реактивного запроса. Несколько запросов — списком (D-04).
- `maps.tsx`: блок «Запросы на наблюдение» над сегментом, `PendingObservedCard` в вкладке «Наблюдаемые», кнопка отмены (D-07, `AlertDialog` как в `ObserverCard`). Все стили через `useThemedStyles` (Phase 76), цвета через `getColor(..., theme)`. Тексты по-русски. Сообщения об ошибках без деталей сервера.

## Common Pitfalls

1. **Деплой схемы с обязательным `status` на существующих данных падает** — двухшаговая выкатка (см. выше). Warning sign: ошибка валидации схемы при `convex deploy`.
2. **Пропуск дубликатов пары**: `.first()` в `assertObserverAccess` мог взять не ту строку; использовать `collect()`/`some`. Revoke, accept, decline, cancel — все по всем строкам пары.
3. **`getObservedPatients` читает пациента до проверки статуса** — вынести `status` проверку первой строкой цикла.
4. **`Record<PushId, number>` в `checkScheduledPushes`** падает на tsc при добавлении id — разделить типы.
5. **Модалка зацикливается/всплывает повторно** — запоминать показанные `linkId`.
6. **Утечка через различающиеся ответы** `redeemCode` — единая ошибка для «нет кода»; нейтральная для declined; не возвращать имя пациента в ответе `redeemCode`.
7. **Спам запросами** — rate-limit остаётся, плюс `lastNotifiedAt` 24 ч для push, плюс D-10.
8. **Изменение типа возврата `redeemCode`** ломает `maps.tsx` — править вместе.
9. **Клиника в `doctors` без verified** не должна утекать — отдавать `clinic` только при `verified`.
10. **Цель deep link** — белый список в `NotificationsProvider`.

## Code Examples

### Миграция (образец — `backfillMealEatenAt` в convex/migrations.ts)
```ts
export const backfillObserverLinkStatus = migrations.define({
  table: "observerLinks",
  migrateOne: (_ctx, link) => {
    if (link.status === undefined) {
      return { status: "active" as const, confirmedAt: link._creationTime, requestedAt: link._creationTime };
    }
  },
});
```

### Отправка push из мутации (образец — checkScheduledPushes.ts:290)
```ts
await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification.default, {
  messages: tokens.map(t => ({ expoPushToken: t.expoPushToken, title, body, data: { url } })),
});
```

## State of the Art
Не применимо: библиотеки не менялись. Конвенции проекта: `logError` в `catch`, секреты не логируются, `try/catch` с rethrow в каждой функции, русские комментарии.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Все существующие строки `observerLinks` без `status` (prod и dev деплойменты) | Миграция D-13 (data migration), отдельно от code edit |
| Live service config | Нет (Convex-таблицы + Expo push; ничего вне git) | None, проверено чтением кода |
| OS-registered state | Нет | None |
| Secrets/env vars | Нет новых | None |
| Build artifacts | `convex/_generated/api.d.ts` обновляется `npx convex dev/codegen` | Регенерировать после добавления модулей |

## Environment Availability
Новых внешних зависимостей нет. Для миграции нужен доступ к Convex dev/prod деплойменту (`npx convex run`), действие человека (checkpoint). [ASSUMED: доступ есть, не проверялось.]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | нет jest/vitest; verify-скрипты на `node:assert` через ts-node [VERIFIED: package.json scripts] |
| Config file | отсутствует (`scripts/verify*.ts`, `scripts/checks/*.mjs`) |
| Quick run | `npm run script:verifyLinkStatus` (создать) и `npm run script:verifyPushRules` |
| Full suite | `npx tsc --noEmit && npx eslint .` + все `script:verify*` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Command | File |
|--------|----------|-----------|---------|------|
| LINK-01 | `canTransition`, `isActiveLink` (pending не active) | unit (чистый модуль) | `npm run script:verifyLinkStatus` | Wave 0 |
| LINK-01 | `getObservedPatients`/шлюз не читают пациента для pending | static check (grep порядка/`assertObserverAccess`) | `node scripts/checks/observerGate.check.mjs` | Wave 0 |
| LINK-02 | accept/decline переходы, только пациент | unit автомата | verifyLinkStatus | Wave 0 |
| LINK-03 | revoke → revoked, дубликаты | unit автомата | verifyLinkStatus | Wave 0 |
| LINK-04 | миграция идемпотентна | `dryRun` вручную на dev | `npx convex run migrations:run ...` | manual (деплоймент) |
| LINK-05 | clinic только при verified | unit функции `resolveDoctorBadge` (вынести в lib) | verifyLinkStatus | Wave 0 |
| Push | OBS-01 проходит правила | unit | `npm run script:verifyPushRules` | ✅ расширить |
| SC6 | типы и линт | static | `npx tsc --noEmit`, `npx eslint .` | ✅ |

### Sampling
- Per task: tsc + релевантный verify-скрипт. Per wave: полный набор. Phase gate: всё зелёное + ручной сценарий на dev (два аккаунта: код → pending → confirm → revoke).
- Wave 0: `scripts/verifyLinkStatus.ts`, npm script, `lib/observers/linkStatus.ts`. Convex-функции без фреймворка тестов не автотестируются; логику переходов нужно выносить в чистые функции.

## Security Domain

### Applicable ASVS Categories
| Category | Applies | Control |
|----------|---------|---------|
| V2 Authentication | да | `getAuthUserId` в каждой функции |
| V3 Session | нет (Convex Auth) | — |
| V4 Access Control | да (ключевое) | `assertObserverAccess` active-only; проверка роли/участия в мутациях; `doctors` только internal-мутации |
| V5 Input Validation | да | `v.id(...)`, `v.union` для decision; формат кода `^\d{5}$` |
| V6 Cryptography | нет | — |

### Threat Patterns
| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| IDOR: подтвердить/отозвать чужую связь по linkId | Tampering/EoP | проверка `callerId` против `patientId`/`observerId` по роли |
| Перебор 5-значного кода | Info disclosure | два rate-limit, имя не раскрывается до active (D-05) |
| Доступ до подтверждения | EoP | статус проверяется в шлюзе и в `getObservedPatients` |
| Подмена пометки «Врач» | Spoofing | `doctors` пишется только internal-мутацией; клиника из БД |
| Спам push/запросами | DoS | rate-limit, `lastNotifiedAt`, cooldown D-10 |
| Произвольный deep link из push | Tampering | белый список URL в `NotificationsProvider` |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `_creationTime` неявно добавляется в конец индекса, диапазон по нему допустим | Схема | Низкий; используем явный `requestedAt` в индексе |
| A2 | OCC делает check-then-insert в одной мутации безопасным | redeemCode | Низкий; `collect()` защита остаётся |
| A3 | Push в тихие часы (22–08) пропускать | Push | Продуктовое: пациент мог бы получить push ночью. Спросить |
| A4 | Cooldown только на declined, не на revoked | redeemCode | Возможен спам повторных запросов после revoke |
| A5 | Доступ к Convex deployment для запуска миграции есть | Environment | Блокер шага миграции |
| A6 | Отмена pending наблюдателем хранится как `revoked` (`endedBy=observer`), так как новых статусов D-09 не добавляет | Автомат | Если нужен отдельный `cancelled`, поправить union |

## Open Questions

1. Тихие часы для push OBS-01 (A3) и cooldown после revoke (A4): уточнить у пользователя или принять рекомендации выше.
2. Нужен ли пациенту экран запроса отдельным маршрутом (SC2 «экран»), или достаточно bottom-sheet + блок в maps.tsx (D-03)? Рекомендация: sheet + блок, без нового маршрута.
3. Показывать ли пациенту email/телефон наблюдателя в запросе (сейчас `getMyObservers` уже отдаёт name/email/phone fallback)? Рекомендация: так же, как сейчас.

## Project Constraints (from CLAUDE.md)
- Отвечать пользователю на русском языке; тексты UI, комментарии и коммиты в проекте по-русски.
- Фиксы через GSD; в конце `npx tsc --noEmit` и `npx eslint .` без ошибок (SC6).
- `.planning/codebase` устарел: ориентироваться на реальный код.

## Sources

### Primary (HIGH — прочитанный код репозитория)
- `convex/tables/observerLinks.ts`, `convex/utils/observerAuth.ts`, `convex/observers/*`, `convex/users/deleteUser.ts`, `convex/migrations.ts`, `convex/crons.ts`, `convex/rateLimit.ts`, `convex/notifications/{sendPushNotification,checkScheduledPushes}.ts`, `lib/notifications/{pushCatalog,pushRules}.ts`, `scripts/verifyPushRules.ts`, `components/notifications/NotificationsProvider.tsx`, `app/app/(tabs)/maps.tsx`, `components/home/HomeHeader.tsx`, `components/ui/BottomSheet.tsx`, `app/app/(settings)/observedPatient/[patientId].tsx`

### Tertiary (LOW)
- Поведение Convex OCC/индексов (A1, A2) из знаний, не перепроверялось по docs.convex.dev в этой сессии.

## Metadata
**Confidence:** стек HIGH (всё в репозитории), архитектура HIGH, питфоллы HIGH, продуктовые допущения A3/A4 MEDIUM.
**Research date:** 2026-11-13. **Valid until:** 30 дней (стабильный код).
