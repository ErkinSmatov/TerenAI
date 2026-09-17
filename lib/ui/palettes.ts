export type ThemeName = "light" | "dark";

const light = {
  base: [255, 255, 255], // #ffffff
  primary: [59, 130, 246], // #3B82F6
  primaryLight: [191, 219, 254], // #bfdbfe
  background: [249, 250, 251], // #f9fafb
  foreground: [3, 7, 18], // #030712
  muted: [243, 244, 246], // #f3f4f6
  mutedForeground: [107, 114, 128], // #6b7280
  secondary: [229, 231, 235], // #e5e7eb
  destructive: [239, 68, 68], // #ef4444

  calorie: [3, 7, 18], // #030712
  carb: [234, 179, 8], // #eab308
  protein: [239, 68, 68], // #ef4444
  fat: [16, 185, 129], // #10b981

  health: [34, 197, 94], // #22c55e
  fiber: [249, 115, 22], // #f97316
  sugar: [236, 72, 153], // #ec4899
  sodium: [6, 182, 212], // #06b6d4

  red: [239, 68, 68], // #ef4444
  orange: [249, 115, 22], // #f97316
  amber: [245, 158, 11], // #f59e0b
  yellow: [234, 179, 8], // #eab308
  lime: [132, 204, 22], // #84cc16
  green: [34, 197, 94], // #22c55e
  emerald: [16, 185, 129], // #10b981
  teal: [20, 184, 166], // #14b8a6
  cyan: [6, 182, 212], // #06b6d4
  sky: [14, 165, 233], // #0ea5e9
  blue: [59, 130, 246], // #3b82f6
  indigo: [99, 102, 241], // #6366f1
  violet: [139, 92, 246], // #8b5cf6
  purple: [168, 85, 247], // #a855f7
  fuchsia: [217, 70, 239], // #d946ef
  pink: [236, 72, 153], // #ec4899
  rose: [244, 63, 94], // #f43f5e
} as const;

const dark = {
  base: [39, 44, 53], // #272C35 — surface/card accent
  primary: [201, 241, 76], // #C9F14C — лайм-акцент
  primaryLight: [201, 241, 76], // #C9F14C — источник свечения/градиента
  background: [10, 13, 18], // #0A0D12
  foreground: [243, 245, 249], // #F3F5F9
  muted: [21, 24, 31], // #15181F — surface/card neutral
  mutedForeground: [146, 153, 165], // #9299A5
  secondary: [255, 255, 255], // используется только с низкой прозрачностью (rgba(255,255,255,0.08) для границ)
  destructive: [233, 69, 69], // #E94545

  calorie: [243, 245, 249], // роль «foreground для метрики» на тёмном фоне
  carb: [234, 179, 8], // #eab308 (без изменений)
  protein: [239, 68, 68], // #ef4444 (без изменений)
  fat: [16, 185, 129], // #10b981 (без изменений)

  health: [134, 151, 129], // #869781
  fiber: [249, 115, 22], // #f97316 (без изменений)
  sugar: [236, 72, 153], // #ec4899 (без изменений)
  sodium: [6, 182, 212], // #06b6d4 (без изменений)

  red: [233, 69, 69], // #E94545
  orange: [249, 115, 22], // #f97316 (без изменений)
  amber: [245, 158, 11], // #f59e0b (без изменений)
  yellow: [234, 179, 8], // #eab308 (без изменений)
  lime: [132, 204, 22], // #84cc16 (без изменений)
  green: [134, 151, 129], // #869781
  emerald: [16, 185, 129], // #10b981 (без изменений)
  teal: [20, 184, 166], // #14b8a6 (без изменений)
  cyan: [6, 182, 212], // #06b6d4 (без изменений)
  sky: [14, 165, 233], // #0ea5e9 (без изменений)
  blue: [59, 130, 246], // #3b82f6 (без изменений)
  indigo: [99, 102, 241], // #6366f1 (без изменений)
  violet: [139, 92, 246], // #8b5cf6 (без изменений)
  purple: [168, 85, 247], // #a855f7 (без изменений)
  fuchsia: [217, 70, 239], // #d946ef (без изменений)
  pink: [236, 72, 153], // #ec4899 (без изменений)
  rose: [244, 63, 94], // #f43f5e (без изменений)
} as const;

export const palettes = { light, dark } as const;

export type ColorName = keyof typeof palettes.light;

// Проверка на уровне типов: `dark` обязан содержать ровно тот же набор ключей,
// что и `light` — иначе `tsc` упадёт при пропущенном ключе.
const _paletteKeysMatch: Record<ColorName, readonly [number, number, number]> =
  palettes.dark;
void _paletteKeysMatch;
