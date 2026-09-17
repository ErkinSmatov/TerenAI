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

// Экраны, редизайн которых входит в скоуп фазы, переносят свои
// `StyleSheet.create`-блоки с цветами в фабрику `(theme) => ({...})` и
// получают живое переключение темы. Экраны вне скоупа сохраняют текущий
// модульный `StyleSheet.create` и меняют тему после перезапуска приложения —
// это осознанный компромисс.
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
