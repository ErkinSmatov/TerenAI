---
phase: 74-onboarding-push-notifications
plan: 03
subsystem: profile-ui
tags: [goalTrack, health-blocks, report, observer]
requires: []
provides:
  - lib/profile/hasHealthBlocks.ts (hasHealthBlocks)
affects: [74-05]
tech-stack:
  added: []
  patterns: [единый helper признака блоков здоровья на клиенте и сервере]
key-files:
  created:
    - lib/profile/hasHealthBlocks.ts
    - scripts/verifyHealthBlocks.ts
  modified:
    - app/app/(tabs)/index.tsx
    - app/app/(home)/day/[date].tsx
    - app/app/(settings)/health.tsx
    - components/tabs/TabsAddOptions.tsx
    - convex/observers/getPatientToday.ts
    - convex/observers/getObservedPatients.ts
    - convex/reports/getMonthlyReport.ts
    - lib/reports/buildMonthlyReportHtml.ts
key-decisions:
  - "Блоки сахара/давления показываются для glucometer и biohacking; хранимое значение glucometer не меняется, в UI отчёта это «Диабет»"
  - "В отчёте glucose/bloodPressure = null для программ без блоков здоровья"
requirements-completed: [ONB-PROGRAM]
duration: 8min
completed: 2026-10-21
---

# Phase 74 Plan 03: hasHealthBlocks Summary

Единый helper hasHealthBlocks (glucometer или biohacking) заменил сравнения goalTrack === "glucometer" на Главной, в дне, меню «+», экране «Здоровье», у наблюдателя и в месячном отчёте; режим glucometer в отчёте подписан «Диабет».

## Задачи

1. hasHealthBlocks, verify-скрипт, клиентские экраны — `522cfbe`
2. Observer-запросы, getMonthlyReport, подпись «Диабет» — `cacace9`

## Верификация

`verifyHealthBlocks: OK`, `npx tsc --noEmit` без ошибок, eslint по изменённым файлам чист, сравнений goalTrack === "glucometer" вне helper не осталось.

## Deviations from Plan

None - plan executed exactly as written.

Примечание: app/app/(settings)/health.tsx содержал незакоммиченные правки пользователя (TerenAI -> Teren). В коммит вошли только мои хунки (через git apply --cached), правки пользователя остались в рабочем дереве неиндексированными.

## Known Stubs

None.

## Self-Check: PASSED
