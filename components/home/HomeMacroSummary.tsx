import { View } from "react-native";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
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

export default function HomeMacroSummary({
  totalMacros,
  readOnly = false,
  targets: targetsProp,
  movement = null,
}: Props) {
  const { theme } = useThemeContext();
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
    { name: string; value: number; target: number; color: string },
    { name: string; value: number; target: number; color: string },
    { name: string; value: number; target: number; color: string },
  ] = [
    {
      name: "Белки",
      value: totalMacros.protein,
      target: targets.protein,
      color: getColor("protein", undefined, theme),
    },
    {
      name: "Жиры",
      value: totalMacros.fat,
      target: targets.fat,
      color: getColor("fat", undefined, theme),
    },
    {
      name: "Углеводы",
      value: totalMacros.carbs,
      target: targets.carbs,
      color: getColor("carb", undefined, theme),
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
