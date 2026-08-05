# 01-02 SUMMARY — SDK, ранняя инициализация, рантайм-безопасный logError

**Статус:** выполнено 2026-08-05

## Установленная версия

**`@sentry/react-native@7.2.0`** — не 8.x, как предполагал план. Версию выбрал `npx expo install`, который согласует её с Expo SDK 54; в вопросе совместимости он авторитетнее предположения, сделанного при планировании. Обе нужные точки входа в 7.2.0 присутствуют, проверено по исходникам пакета:

- `getSentryExpoConfig` в `@sentry/react-native/metro`
- `withSentry` в `@sentry/react-native/expo` (сигнатура `ConfigPlugin<void | PluginProps>` с полями `organization`, `project`, `authToken`, `url`)

## Что сделано

| Файл | Изменение |
|---|---|
| `metro.config.js` | `getDefaultConfig` → `getSentryExpoConfig`; кастомизация SVG сохранена дословно |
| `app.config.ts` | Конфиг вынесен в константу, default export возвращает `withSentry(config, {...})`; содержимое конфига не тронуто |
| `index.ts` | Побочный импорт `@/lib/monitoring/initMonitoring` строго выше импорта роутера |
| `app/_layout.tsx` | Default export обёрнут в `Sentry.wrap` |
| `lib/utils/errorReporter.ts` | Новый: реестр репортеров, ноль импортов |
| `lib/utils/logError.ts` | Прежний `console.error` + доставка в репортер под `try`/`catch`; сигнатура не изменилась |
| `lib/monitoring/initMonitoring.ts` | Новый: `Sentry.init` + регистрация репортера |

Слаги `codetau-et` / `terenai` вписаны литералами. `SENTRY_AUTH_TOKEN` в код не попал; файлы `sentry.properties` и `.sentryclirc` не создавались.

## Проверка применения плагина

`expo config --json` не показывает Sentry в массиве `plugins` — и это ожидаемо: `withSentry` не добавляет себя туда, а навешивает моды `withSentryAndroid`/`withSentryIOS`, работающие во время prebuild. Подтверждение применения получено иначе — в `expo config --type introspect` присутствует:

```
pluginHistory: { '@sentry/react-native': { name: '@sentry/react-native', version: '7.2.0' } }
```

## Осознанные ограничения

**`useNativeInit` не включён.** Опция добавляет `RNSentrySDK.start()` в AppDelegate и требует `sentry.options.json` с DSN в корне. Следствие: **краши, происходящие до загрузки JS-бандла, этой конфигурацией не покрываются.** Это не упущение, а сознательный размен — опция добавляет отдельный уровень риска и в объём OBS-01…04 не входит.

**Ошибки Convex-функций в Sentry не попадут.** Репортер регистрируется только клиентом; в серверном V8-изоляте он остаётся `null`. Это физическое ограничение рантайма Convex, а не недоделка. Логи функций живут в дашборде деплоймента `keen-meerkat-110`.

**Интеграции не подключались** (`expoRouterIntegration`, `httpClientIntegration`, `reactNavigationIntegration`). Первые две относятся к трассировке, `httpClientIntegration` дополнительно собирал бы заголовки и куки запросов к Convex, включая токен авторизации.

## Нативные папки

Подтверждено: `/ios/` и `/android/` перечислены в `.gitignore` (строки 5-6), `git ls-files ios/` возвращает пусто, `.easignore` отсутствует. EAS получает проект без нативных папок и **сам выполняет prebuild**, применяя конфиг-плагины. Ручной `expo prebuild` с коммитом нативных папок не требуется.

## Отклонения от плана

1. **Версия 7.2.0 вместо 8.x** — см. выше.

2. **Два автоматических гейта плана дали ложные срабатывания на собственных комментариях кода.** Гейт порядка импортов сравнивает `indexOf('initMonitoring')` с `indexOf('expo-router/entry')`, но не вырезает комментарии — а пояснение над импортом содержало эту строку буквально и находилось выше. Аналогично гейт «`@sentry/react-native` не встречается в `lib/utils/`» срабатывал на комментарии в `errorReporter.ts`, который объясняет, почему этот импорт запрещён. Комментарии переформулированы с сохранением смысла: оставлять заведомо красный гейт нельзя — при повторной верификации сломанную проверку начинают игнорировать.

3. **Убрано приведение `as ExpoConfig`** после `withSentry` — линт справедливо указал, что оно избыточно (`@typescript-eslint/no-unnecessary-type-assertion`).

## Результаты проверок

```
npx tsc --noEmit          → код 0
npx eslint .              → код 0
npx expo config --json    → CONFIG_OK
npx convex dev --once     → код 0, «Convex functions ready!»
grep @sentry в convex/, scripts/, lib/utils/ → 0
```

Деплой Convex — единственная настоящая проверка того, что серверный рантайм принял новый `logError`: ни линт, ни `tsc` бандлер Convex не эмулируют.

## Требования

OBS-01, OBS-02, OBS-03 — код на месте. **Фактическая доставка событий в Sentry не проверена** — это план 01-04, требующий релизной сборки.
