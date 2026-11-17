---
phase: 78-confirmed-observation
plan: 10
status: complete
requirements: [LINK-04]
completed: 2026-11-17
---

# План 78-10: миграция D-13 на деплойменте Convex

## Итог

Код шага 1 задеплоен, миграция `backfillObserverLinkStatus` выполнена, все существующие связи получили `status: active`. Решение по prod: **prod-done**.

## Задача 1: деплой и миграция

- `npx convex dev --once`: добавлены индексы `doctors.byUserId` и `observerLinks.byStatusAndRequestedAt`.
- dryRun: обработано 6 строк, результат корректный (`status: active`, `confirmedAt = requestedAt = _creationTime`).
- Реальный запуск: обработано 6 строк. `lib:getStatus`: `isDone: true`, `state: success`.
- `npx convex data observerLinks`: у всех 6 строк есть `status: "active"`.
- `convex dev` перегенерировал `convex/_generated/api.d.ts`, заменив ручные правки исполнителей (коммит f25be3a). В ручной версии не хватало `observerSummary` и `tables/doctors`, а в волне 1 были испорчены две строки.

## Важная находка: dev и production — один деплоймент

`EXPO_PUBLIC_CONVEX_URL` в `.env.local`, `.env.production.local` и в EAS-окружении `production` указывает на `keen-meerkat-110` (проект terenai-dev, тип dev). Отдельного prod-деплоймента нет. Поэтому деплой на «dev» сразу затронул релизные сборки (Sentry-окружение `testflight`).

## Инцидент

После деплоя Sentry показал краш старой сборки 1.2.1(24) при открытии ввода кода (EXC_BAD_ACCESS в Hermes GC, WatchdogTermination). Причина не доказана, но совпадает с описанным риском: старый клиент получал заглушку pending без полей карточки.

Исправление (коммит 816d5a2): `getObservedPatients` принимает `supportsPending` и отдаёт pending только клиентам, которые его передали. `maps.tsx` передаёт `true`. В `observerGate.check` добавлена проверка. Пользователь сообщил, что краш прекратился.

Остаточные отличия для старых клиентов: `redeemCode` возвращает `{ ok: false }` вместо ошибки (старый клиент покажет успех без связи); входящие запросы пациент на старой сборке не увидит.

## Допущения

Пользователь ответил только `prod-done` и сообщил, что краш прошёл. Допущения явно не подтверждал и не правил, они остаются действующими по умолчанию:

- A3: push OBS-01 не отправляется в тихие часы 22:00–08:00 (бейдж и лист показывают запрос всегда). Не подтверждено явно.
- A4: повторный запрос после отзыва разрешён сразу, cooldown 24 ч только после отказа. Не подтверждено явно.
- A6: отмена запроса наблюдателем хранится как `revoked` с `endedBy: observer`. Не подтверждено явно.
- A7: порядок деплоя prod решил пользователь (prod-done). Подтверждено.

## Решение по prod

prod-done. Миграция выполнена на единственном деплойменте `keen-meerkat-110`.
