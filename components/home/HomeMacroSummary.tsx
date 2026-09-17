import { View } from "react-native";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { profilesConfig } from "@/config/profilesConfig";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import HomeCalorieOverviewCard from "./HomeCalorieOverviewCard";
import { MacrosType } from "@/convex/tables/mealItems";
import { Doc } from "@/convex/_generated/dataModel";
import useProgress from "@/lib/hooks/reanimated/useProgress";

type Props = {
  totalMacros: MacrosType;
  readOnly?: boolean;
  targets?: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
  // Опционален по историческим причинам: экраны вне скоупа этой волны
  // (Дневник, наблюдатель — `app/app/(home)/day/[date].tsx`,
  // `app/app/(settings)/observedPatient/[patientId].tsx`) продолжают
  // вызывать этот компонент без movement и рендерят отдельную
  // `HomeMovementSummary` рядом, как раньше.
  movement?: Doc<"movementData"> | null;
};

// Фиксированные декоративные градиенты каждого макроса — буквально из Figma
// (node 863:5405), НЕ через getColor()/тему. Осознанное отступление от
// обычного соглашения проекта «всё через getColor»: на чекпоинте D-03
// (2-й раунд коррекции) пользователь явно попросил зафиксировать именно эти
// hex-цвета для карточки калорий — одинаковые в светлой и тёмной теме.
// НЕ "чинить" обратно на семантические токены `protein`/`fat`/`carb`.
const PROTEIN_GRADIENT: [string, string] = ["#F1853C", "#F7F1E3"];
const FAT_GRADIENT: [string, string] = ["#8489DA", "#F7F1E3"];
const CARB_GRADIENT: [string, string] = ["#F47F6E", "#F7F1E3"];

export default function HomeMacroSummary({
  totalMacros,
  readOnly = false,
  targets: targetsProp,
  movement = null,
}: Props) {
  const styles = useThemedStyles(createStyles);

  // В readOnly-режиме (наблюдатель смотрит чужой детальный вид) запрос
  // вообще не выполняется ("skip") — targetsProp может легитимно быть
  // undefined (у пациента ещё нет profiles.targets), и в этом случае
  // нельзя незаметно подставить цели наблюдателя вместо целей пациента.
  const profileTargets = useQuery(
    api.profiles.getProfile.default,
    readOnly ? "skip" : {}
  )?.targets;
  const targets = readOnly
    ? (targetsProp ?? profilesConfig.defaultValues.targets)
    : (targetsProp ?? profileTargets ?? profilesConfig.defaultValues.targets);

  const progress = useProgress();

  // Порядок фиксирован по Figma-макету (node 863:5405): Белки, Жиры, Углеводы.
  const macros: [
    { name: string; value: number; target: number; gradientColors: [string, string] },
    { name: string; value: number; target: number; gradientColors: [string, string] },
    { name: string; value: number; target: number; gradientColors: [string, string] },
  ] = [
    {
      name: "Белки",
      value: totalMacros.protein,
      target: targets.protein,
      gradientColors: PROTEIN_GRADIENT,
    },
    {
      name: "Жиры",
      value: totalMacros.fat,
      target: targets.fat,
      gradientColors: FAT_GRADIENT,
    },
    {
      name: "Углеводы",
      value: totalMacros.carbs,
      target: targets.carbs,
      gradientColors: CARB_GRADIENT,
    },
  ];

  return (
    <View style={styles.container}>
      <HomeCalorieOverviewCard
        calories={{ value: totalMacros.calories, target: targets.calories }}
        macros={macros}
        movement={movement}
        progress={progress}
      />
    </View>
  );
}

const createStyles = (_theme: ThemeName) => ({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
