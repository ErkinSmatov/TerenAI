# 01-01 SUMMARY — Проект в Sentry и секреты сборки

**Статус:** выполнено 2026-08-05

## Параметры Sentry (не секреты — нужны плану 01-02)

| Параметр | Значение |
|---|---|
| Organization slug | `codetau-et` |
| Project slug | `terenai` |
| Project ID | `4511858344722512` (совпадает с хвостом DSN) |
| Платформа | React Native |

Оба слага подставляются в конфиг-плагин Sentry в `app.config.ts`. Без них загрузка sourcemaps молча не сработает — стек-трейсы релиза останутся адресами Hermes-байткода.

## Переменные в EAS

| Переменная | production | development | Visibility |
|---|---|---|---|
| `EXPO_PUBLIC_SENTRY_DSN` | ✓ | ✓ | plaintext |
| `EXPO_PUBLIC_SENTRY_ENVIRONMENT` | `testflight` | `development` | plaintext |
| `SENTRY_AUTH_TOKEN` | ✓ | ✓ | sensitive |

Значение `testflight` вместо `production` выбрано осознанно: по решению в PROJECT.md сборки этого майлстоуна ходят в dev-деплоймент Convex `keen-meerkat-110`, и метка `production` в дашборде создала бы ложную картину.

## Проверка доступа токена (дифференциальная)

```
sentry-cli releases list --org codetau-et --project terenai   → exit 0
sentry-cli releases list --org codetau-et --project nonexist  → exit 1, "Project not found"
```

Проверка значима: неверные параметры действительно приводят к ошибке, то есть успех первой команды не является тривиальным. Токен имеет скоуп `org:ci` — это современный организационный токен Sentry, предназначенный для CI-загрузки sourcemaps.

## Отклонения от плана

1. **Команда `eas env:create` устарела** — использована актуальная `eas env:set`. Флаг `--environment` повторяемый, обе среды заполняются одной командой.

2. **Пользователь изначально сообщил слаги перепутанными** (`ORG-SLUG="terenai"`, `PROJECT-SLUG="4511858344722512"`). Расхождение поймано тем, что `sentry-cli` сообщил о зашитой в токен организации `codetau-et`. Фактически: org — `codetau-et`, project — `terenai`, а `4511858344722512` — числовой ID. Пометки в `.env.local` исправлены.

3. **Токен и DSN пользователь положил в `.env.local`, а не в EAS.** Это тот же класс ошибки, что уронил сборку 1.2.1 (1): файл в `.gitignore`, сборщик EAS его не видит. Перенесено в EAS подстановкой из файла — значение токена нигде не печаталось.

4. **DSN был назван `SENTRY_DSN_TOKEN`** — без префикса `EXPO_PUBLIC_` Expo не вшивает переменную в клиентский бандл, приложение не прочитало бы её и локально. Переименовано в `EXPO_PUBLIC_SENTRY_DSN`, значение сверено после правки.

## Не сделано

**Rate Limits / Spike Protection в Sentry** (шаг 6 плана) — не подтверждено. DSN публичен по устройству, и без лимита посторонний может исчерпать квоту. Стоит включить в `Settings → Projects → terenai → Client Keys → Rate Limits`. Не блокирует следующие планы.

## Требования

OBS-01 (частично — инфраструктура готова, отправка событий в 01-02), OBS-03 (частично — токен и доступ проверены, загрузка sourcemaps настраивается в 01-02).
