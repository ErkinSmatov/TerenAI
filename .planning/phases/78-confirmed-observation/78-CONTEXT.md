# Phase 78: Подтверждаемое наблюдение (бэкенд и приложение) - Context

**Gathered:** 2026-11-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Любой наблюдатель (родственник, тренер, врач) получает доступ к данным пациента только после явного подтверждения пациентом. Связь `observerLinks` получает жизненный цикл (`pending` → `active` / `declined` / `revoked` / `expired`). Врач отличается от других наблюдателей пометкой «Врач · Клиника», которую ставит сервер.

В фазу входит: схема и миграция `observerLinks`, `redeemCode` создаёт `pending`, `assertObserverAccess` пускает только `active`, функции подтверждения/отказа/отмены/отзыва, push + бейдж + модалка у пациента, заглушка у наблюдателя, авто-истечение, минимальная таблица `doctors`.

Вне фазы: приглашения врача (QR, ссылки, Install Referrer — Фаза 81), сайт TerenDesk и вход врача (Фаза 80), журнал доступа (Фаза 79), права по категориям данных (Фазы 79 и 82).

</domain>

<decisions>
## Implementation Decisions

### Уведомление пациента о запросе
- **D-01:** Три канала сразу: push, бейдж на иконке наблюдения в `HomeHeader`, модальное окно при открытии приложения. Согласие нельзя пропустить незамеченным.
- **D-02:** Push отправляется через существующий `convex/notifications/sendPushNotification.ts` и `pushTokens`. В `lib/notifications/pushCatalog.ts` добавляется новый тип (отдельный класс; он транзакционный и не входит в лимиты C/D и тумблеры напоминаний). Нужен ответ планировщику: как тип встраивается в `PushId`/`PUSH_CATALOG` и не ломает `verifyPushRules`.

### Где пациент обрабатывает запросы
- **D-03:** Блок «Запросы на наблюдение» живёт в том же разделе, где код пациента и список наблюдателей (сейчас это `app/app/(tabs)/maps.tsx` с `ShareCodeCard`, `ObserverCard`). При новом запросе на главной всплывает bottom-sheet с кнопками «Разрешить» и «Отклонить».
- **D-04:** Несколько запросов одновременно показываются списком, каждый подтверждается отдельно.

### Что видит наблюдатель до подтверждения
- **D-05:** Карточка-заглушка «Запрос отправлен, ожидает подтверждения» без имени, email и телефона пациента. Имя показывается только после `active`. Причина: код из 5 цифр можно подобрать, и по нему нельзя раскрывать личность.
- **D-06:** `getObservedPatients` не читает данные пациента для `pending`. Возвращает только заглушку (`linkId`, `status`, время).

### Срок и отмена запроса
- **D-07:** Наблюдатель может отменить свой неподтверждённый запрос в любой момент.
- **D-08:** `pending` без ответа 14 дней автоматически становится `expired` (cron в `convex/crons.ts`, по образцу `checkScheduledPushes`).

### Claude's Discretion
(пользователь делегировал, зафиксировано как рабочее решение)
- **D-09:** Статусы хранятся, а не удаляются: `pending`, `active`, `declined`, `revoked`, `expired`. Это нужно для аудита и для запрета спама. Это меняет текущее поведение `revokeLink` (сейчас физическое удаление всех строк пары), учесть дубликаты пары из-за check-then-insert.
- **D-10:** После `declined` повторный запрос того же наблюдателя блокируется на 24 часа. Ответ без раскрытия, что пациент отклонил (наблюдатель видит нейтральное «запрос не принят»).
- **D-11:** В Фазе 78 создаётся минимальная таблица `doctors` (`userId`, ФИО, клиника, `status: pending | verified`), заводится вручную через internal-мутацию. Расширение (2FA, клиники, роли) — Фаза 80. Пометка «Врач · Клиника» выводится только при `status = verified`.
- **D-12:** Объём доступа при подтверждении — целиком, без выбора категорий. Категории (фото и др.) — Фазы 79 и 82.
- **D-13:** Миграция через `@convex-dev/migrations`: все существующие `observerLinks` получают `status = active`, `confirmedAt = _creationTime`.

### Решено ранее (Phase 6, не пересматривается)
- Код пациента постоянный и многоразовый, ротация только вручную (06-D-02).
- Много наблюдателей на пациента и много пациентов на наблюдателя (06-D-04, 06-D-05).
- Отзыв доступен с обеих сторон (06-D-08, 06-D-09).
- Единственный шлюз кросс-пользовательского чтения — `assertObserverAccess`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Предыдущая фаза наблюдателя
- `.planning/phases/06-observer-access/06-CONTEXT.md` — решения 06-D-01…D-09 (код, связи, отзыв)
- `.planning/phases/06-observer-access/06-VERIFICATION.md` — что подтверждено в Phase 6

### Требования и роадмап
- `.planning/REQUIREMENTS.md` — LINK-01…LINK-05
- `.planning/ROADMAP.md` — Phase 78, Success Criteria 1–6 и ключевые решения TerenDesk

### Код наблюдателя (читать целиком)
- `convex/tables/observerLinks.ts` — схема связи
- `convex/utils/observerAuth.ts` — `assertObserverAccess`, единственный шлюз
- `convex/observers/redeemCode.ts`, `generateCode.ts`, `regenerateCode.ts`, `revokeLink.ts`, `getMyObservers.ts`, `getObservedPatients.ts`, `getPatientToday.ts`, `getPatientHistory.ts`
- `convex/users/deleteUser.ts` — удаление связей при удалении аккаунта

### Push и cron
- `convex/notifications/sendPushNotification.ts`, `lib/notifications/pushCatalog.ts`, `lib/notifications/pushRules.ts`, `convex/crons.ts`
- `scripts/checks/` — verify-скрипты, образец для новых проверок

### UI
- `app/app/(tabs)/maps.tsx`, `components/observer/` (`ShareCodeCard`, `ObserverCard`, `ObservedPatientCard`, `observerCardTheme.ts`), `components/home/HomeHeader.tsx`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assertObserverAccess`: расширить проверкой `status === "active"`, остальные функции пациента не менять.
- `rateLimiter` (`observerCodeRedeem`, `observerCodeGuess`): остаются на `redeemCode`.
- `@convex-dev/migrations` и `convex/migrations.ts`: для D-13.
- `sendPushNotification` + `pushTokens`: канал push (D-02).
- `convex/crons.ts`: добавить задачу истечения (D-08).

### Established Patterns
- Каждая observer-функция начинается с `assertObserverAccess` до чтения данных пациента.
- Ошибки логируются через `logError`, секреты не логируются.
- Тексты на русском, темы через `useThemedStyles` (Phase 76).

### Integration Points
- `redeemCode`: сейчас идемпотентно возвращает id существующей связи и вставляет сразу рабочую связь; станет `pending`.
- `getMyObservers`: сейчас отдаёт всех (включая будущие `pending`), нужно разделить на активных и запросы.
- `revokeLink`: физическое удаление всех строк пары → смена статуса с учётом дубликатов.
- `getObservedPatients`, `getPatientToday`, `getPatientHistory`: должны отдавать данные только для `active`.
- `HomeHeader`: кнопка наблюдения без `onPress` (см. Phase 6), сюда же бейдж.

</code_context>

<specifics>
## Specific Ideas

Идея пользователя: не выделять врача как отдельную сущность связи. Любой наблюдатель получает код, наблюдаемый подтверждает, а у врача в карточке только пометка.

</specifics>

<deferred>
## Deferred Ideas

- Выбор категорий данных при подтверждении (фото, давление и др.) — Фазы 79 и 82.
- Приглашения врача: QR, ссылка, Install Referrer, короткий код iOS — Фаза 81.
- Журнал доступа наблюдателей — Фаза 79.
- Блокировка наблюдателя пациентом навсегда (сейчас только 24 часа после отказа) — возможно позже.

</deferred>

---

*Phase: 78-Подтверждаемое наблюдение (бэкенд и приложение)*
*Context gathered: 2026-11-13*
