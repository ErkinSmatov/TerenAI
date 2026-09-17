import { TextStyle } from "react-native";

export type FontFamilyName = "manrope" | "outfit";

const manropeFamilies = {
  400: "Manrope_400Regular",
  600: "Manrope_600SemiBold",
} as const;

const outfitFamilies = {
  400: "Outfit_400Regular",
  600: "Outfit_600SemiBold",
} as const;

function normalizeWeight(w?: TextStyle["fontWeight"]): 400 | 600 {
  if (!w) {
    return 400;
  }
  const n = typeof w === "string" ? parseInt(w, 10) : (w as number);
  return n >= 600 ? 600 : 400;
}

type Params = {
  weight?: TextStyle["fontWeight"];
  // Manrope и Outfit в Google Fonts не имеют курсивных начертаний, поэтому
  // `style` сохраняется в сигнатуре (его передаёт Text.tsx), но осознанно
  // игнорируется при выборе семейства — ссылка на несуществующее курсивное
  // начертание молча падает на системный шрифт.
  style?: TextStyle["fontStyle"];
  family?: FontFamilyName;
};

export default function resolveFontFamily({ weight, family }: Params) {
  const table = family === "outfit" ? outfitFamilies : manropeFamilies;
  return table[normalizeWeight(weight)];
}
