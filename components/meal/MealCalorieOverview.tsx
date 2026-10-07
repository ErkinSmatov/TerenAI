import { StyleSheet, View } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { profilesConfig } from "@/config/profilesConfig";
import HomeCalorieOverviewCard from "../home/HomeCalorieOverviewCard";
import WithSkeleton from "../ui/WithSkeleton";
import useProgress from "@/lib/hooks/reanimated/useProgress";
import { MacrosType } from "@/convex/tables/mealItems";

// Те же фиксированные декоративные градиенты, что и на Главной
// (`HomeMacroSummary.tsx`, узел Figma 863:5405) — НЕ через getColor()/тему.
// Скопированы буквально, см. обоснование там.
const PROTEIN_GRADIENT: [string, string] = ["#F1853C", "#F7F1E3"];
const FAT_GRADIENT: [string, string] = ["#8489DA", "#F7F1E3"];
const CARB_GRADIENT: [string, string] = ["#F47F6E", "#F7F1E3"];

type Props = {
  loading: boolean;
  macros?: MacrosType;
};

// Обёртка над `HomeCalorieOverviewCard` для экрана блюда (D-03, 6-й раунд
// коррекции): цели берутся дневные (как на Главной), но значения — только
// этого блюда, а не всего дня. `showActivity={false}` и без `movement` —
// активность/шаги не имеют смысла для одного приёма пищи.
export default function MealCalorieOverview({ loading, macros }: Props) {
  const targets =
    useQuery(api.profiles.getProfile.default)?.targets ??
    profilesConfig.defaultValues.targets;

  const progress = useProgress();

  const macroRows: [
    { name: string; value: number; target: number; gradientColors: [string, string] },
    { name: string; value: number; target: number; gradientColors: [string, string] },
    { name: string; value: number; target: number; gradientColors: [string, string] },
  ] = [
    {
      name: "Белки",
      value: macros?.protein ?? 0,
      target: targets.protein,
      gradientColors: PROTEIN_GRADIENT,
    },
    {
      name: "Жиры",
      value: macros?.fat ?? 0,
      target: targets.fat,
      gradientColors: FAT_GRADIENT,
    },
    {
      name: "Углеводы",
      value: macros?.carbs ?? 0,
      target: targets.carbs,
      gradientColors: CARB_GRADIENT,
    },
  ];

  return (
    <View style={styles.container}>
      <WithSkeleton
        loading={loading}
        skeletonStyle={styles.skeleton}
        containerStyle={styles.skeletonContainer}
      >
        <HomeCalorieOverviewCard
          calories={{ value: macros?.calories ?? 0, target: targets.calories }}
          macros={macroRows}
          progress={progress}
        />
      </WithSkeleton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    flex: 1,
  },
  skeleton: {
    width: "100%",
    height: 220,
    borderRadius: 24,
  },
});
