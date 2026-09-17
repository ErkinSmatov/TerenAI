import { type LucideProps } from "lucide-react-native";
import { View } from "react-native";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { type ComponentType } from "react";
import FatIcon from "../icons/macros/FatIcon";
import CarbIcon from "../icons/macros/CarbIcon";
import ProteinIcon from "../icons/macros/ProteinIcon";
import CalorieIcon from "../icons/macros/CalorieIcon";
import { profilesConfig } from "@/config/profilesConfig";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import HomeSummaryCard from "./HomeSummaryCard";
import HomeSummaryCardBig from "./HomeSummaryCardBig";
import { MacrosType } from "@/convex/tables/mealItems";
import useProgress from "@/lib/hooks/reanimated/useProgress";

type Macro = {
  name: string;
  value: number;
  target: number;
  Icon: ComponentType<LucideProps>;
  color: string;
};

type Props = {
  totalMacros: MacrosType;
  readOnly?: boolean;
  targets?: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
};

export default function HomeMacroSummary({
  totalMacros,
  readOnly = false,
  targets: targetsProp,
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

  const macros: Macro[] = [
    {
      name: "Углеводы",
      value: totalMacros.carbs,
      target: targets.carbs,
      Icon: CarbIcon,
      color: getColor("carb", undefined, theme),
    },
    {
      name: "Белки",
      value: totalMacros.protein,
      target: targets.protein,
      Icon: ProteinIcon,
      color: getColor("protein", undefined, theme),
    },
    {
      name: "Жиры",
      value: totalMacros.fat,
      target: targets.fat,
      Icon: FatIcon,
      color: getColor("fat", undefined, theme),
    },
  ];

  return (
    <View style={styles.container}>
      <HomeSummaryCardBig
        item={{
          name: "Калории",
          value: totalMacros.calories,
          target: targets.calories,
          Icon: CalorieIcon,
          color: getColor("calorie", undefined, theme),
        }}
        progress={progress}
      />
      <View style={styles.cardsContainer}>
        {macros.map((macro) => (
          <HomeSummaryCard
            key={`macro-summary-${macro.name}`}
            item={macro}
            progress={progress}
          />
        ))}
      </View>
    </View>
  );
}

const createStyles = (_theme: ThemeName) => ({
  container: {
    gap: 16,
    flex: 1,
    paddingHorizontal: 16,
  },
  cardsContainer: {
    flexDirection: "row" as const,
    gap: 8,
  },
});
