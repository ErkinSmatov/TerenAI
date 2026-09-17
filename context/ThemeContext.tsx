import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  getActiveTheme,
  setActiveTheme,
} from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";

type ThemeContextValue = {
  theme: ThemeName;
  isDark: boolean;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export function ThemeContextProvider({ children }: Props) {
  // Начальное значение берётся из уже проинициализированного модуля
  // `getColor` — повторного чтения MMKV здесь быть не должно.
  const [theme, setThemeState] = useState<ThemeName>(() => getActiveTheme());

  const setTheme = useCallback((next: ThemeName) => {
    // Порядок важен: сначала обновляем активную палитру (и MMKV), затем
    // ре-рендерим — иначе стили соберутся со старыми цветами.
    setActiveTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error(
      "useThemeContext must be used within a ThemeContextProvider"
    );
  }
  return context;
}
