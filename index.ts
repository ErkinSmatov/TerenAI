import "react-native-get-random-values";

// НЕ ПЕРЕМЕЩАТЬ НИЖЕ ИМПОРТА РОУТЕРА (последняя строка файла).
// Роутер тянет за собой app/_layout.tsx, тот — components/RootLayoutProvider.tsx,
// который бросает исключение на уровне модуля (строки 29-33) при отсутствии
// EXPO_PUBLIC_CONVEX_URL. Единственный способ поймать такой сбой — успеть
// установить обработчик Sentry раньше, то есть строго выше той строки.
import "@/lib/monitoring/initMonitoring";

import "expo-router/entry";
