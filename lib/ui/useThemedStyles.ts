import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";

// Фабрики объявляются на уровне модуля и стабильны по ссылке, поэтому кэш
// по фабрике + теме не даёт `StyleSheet.create` пересобираться на каждый рендер.
const cache = new Map<
  (theme: ThemeName) => unknown,
  Partial<Record<ThemeName, unknown>>
>();

// Все компоненты app/ и components/ переносят цветные стили в модульные
// фабрики `(theme) => ({...})` и передают `theme` третьим аргументом в
// getColor. Модульный `StyleSheet.create` с getColor запрещён и проверяется
// scripts/checks/themeColors.check.mjs.
export default function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: ThemeName) => T
): T {
  const { theme } = useThemeContext();

  return useMemo(() => {
    const cachedForFactory = cache.get(factory);
    const cachedForTheme = cachedForFactory?.[theme];
    if (cachedForTheme) {
      return cachedForTheme as T;
    }

    const styles = StyleSheet.create(factory(theme));
    cache.set(factory, { ...cachedForFactory, [theme]: styles });
    return styles;
  }, [theme, factory]);
}
