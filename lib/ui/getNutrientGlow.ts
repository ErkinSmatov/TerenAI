import type { ViewStyle } from "react-native";
import type { ThemeName } from "@/lib/ui/palettes";

/**
 * Общий приём "плоский фон + цветное свечение", впервые реализованный для
 * `HomeNutrientGlowCard` (Figma node 813:918, `07.1-07-CORRECTION-3-SUMMARY.md`).
 * Тёмная тема: INSET-свечение поверх плоского фона `#15181F`. Светлая тема:
 * своя, менее контрастная трактовка — мягкое АМБИЕНТНОЕ (не inset) цветное
 * свечение по краю карточки поверх стандартного светлого фона (`getColor("base")`).
 *
 * Вынесено в отдельный модуль (07.1-07, 7-й раунд коррекции), чтобы новые
 * тайлы "Низкий"/"Высокий" (`HomeGlucoseRangeTile`) могли переиспользовать
 * ровно ту же визуальную технику без дублирования и без насилования контракта
 * `HomeNutrientGlowCard` (value/target), которому чужда форма "value+unit+icon".
 */
export default function getNutrientGlow(
  theme: ThemeName,
  darkGlowColor: string,
  lightGlowColor: string
): Pick<ViewStyle, "boxShadow"> {
  if (theme === "dark") {
    return {
      boxShadow: [
        {
          offsetX: 0,
          offsetY: 0,
          blurRadius: 40,
          spreadDistance: 0,
          color: darkGlowColor,
          inset: true,
        },
      ],
    };
  }

  return {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 20,
        spreadDistance: 0,
        color: lightGlowColor,
      },
    ],
  };
}
