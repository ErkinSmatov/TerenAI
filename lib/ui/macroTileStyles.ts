// Figma node 1333:795 — плитки 2×2: плоский фон #15181F, цветное внутреннее
// свечение и кольцо с градиентом. Цвета фиксированные (литеральные hex из
// макета), как у hero-карточек Главной; светлая тема — мягкое амбиентное
// свечение того же оттенка (см. getNutrientGlow). Общие для экрана целей и
// шага «Ваш план» онбординга.
export const MACRO_TILE_DARK_BACKGROUND = "#15181F";

type ThemedPair<T> = { dark: T; light: T };

export type MacroTileStyle = {
  ringColors: ThemedPair<[string, string]>;
  glow: ThemedPair<string>;
};

export const MACRO_TILE_STYLES = {
  calories: {
    ringColors: {
      dark: ["#EE6A22", "#FEE8D9"],
      light: ["#EE6A22", "#F8C7A6"],
    },
    glow: { dark: "#a78154", light: "rgba(167, 129, 84, 0.3)" },
  },
  protein: {
    ringColors: {
      dark: ["#FFFFFF", "#C9CCD2"],
      light: ["#4B5563", "#C9CCD2"],
    },
    glow: { dark: "#FFFFFF", light: "rgba(75, 85, 99, 0.2)" },
  },
  carbs: {
    ringColors: {
      dark: ["#F47F6E", "#F7F1E3"],
      light: ["#F47F6E", "#F9CFC8"],
    },
    glow: { dark: "#b84244", light: "rgba(184, 66, 68, 0.25)" },
  },
  fat: {
    ringColors: {
      dark: ["#8489DA", "#F7F1E3"],
      light: ["#8489DA", "#D3D5F1"],
    },
    glow: { dark: "#4772eb", light: "rgba(71, 114, 235, 0.25)" },
  },
} as const satisfies Record<string, MacroTileStyle>;
