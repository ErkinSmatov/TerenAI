import { storage } from "@/lib/storage/mmkv";
import { palettes, type ColorName, type ThemeName } from "@/lib/ui/palettes";

export const THEME_STORAGE_KEY = "ui.theme";

// Синхронное чтение сохранённой темы на уровне модуля: `getColor.ts`
// инициализируется раньше, чем `StyleSheet.create` любого компонента,
// поэтому даже неотредактированные экраны получают корректную палитру
// при холодном старте.
let activeTheme: ThemeName =
  storage.getString(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
let activePalette = palettes[activeTheme];

export function setActiveTheme(theme: ThemeName) {
  activeTheme = theme;
  activePalette = palettes[theme];
  storage.set(THEME_STORAGE_KEY, theme);
}

export function getActiveTheme(): ThemeName {
  return activeTheme;
}

// Третий параметр `theme` существует для worklet-потребителей (Skia/Reanimated):
// worklet замыкает значения модульных переменных в момент своей сериализации,
// поэтому мутация `activePalette` до него не доходит. Такие вызовы обязаны
// передавать тему явно, получив её из `useThemeContext()` в React-области.
export default function getColor(
  name: ColorName,
  opacity?: number,
  theme?: ThemeName
) {
  "worklet";
  const color = theme ? palettes[theme][name] : activePalette[name];

  if (opacity !== undefined) {
    return `rgba(${color.join(", ")}, ${opacity})`;
  }

  return `rgb(${color.join(", ")})`;
}
