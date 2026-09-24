import { StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import getColor from "@/lib/ui/getColor";
import { getTargets } from "@/config/nutrientsConfig";
import HomeNutrientGlowCard from "../home/HomeNutrientGlowCard";
import WithSkeleton from "../ui/WithSkeleton";
import { MicrosType } from "@/convex/tables/mealItems";
import { Id } from "@/convex/_generated/dataModel";

// Те же литеральные HEX/rgba, что и на Главной (`HomeMicroSummary.tsx`,
// Figma-узел 813:918) — НЕ через getColor()/тему. Скопированы буквально,
// см. обоснование там.
const NUTRIENT_GLOW = {
  fiber: { dark: "#56635E", light: "rgba(86, 99, 94, 0.28)" },
  sugar: { dark: "#C1A4BD", light: "rgba(193, 164, 189, 0.30)" },
  sodium: { dark: "#4772EB", light: "rgba(71, 114, 235, 0.22)" },
} as const;

type SourceType =
  | { source: "meal"; id?: Id<"meals"> }
  | { source: "mealItem"; id?: Id<"mealItems"> };

type Props = {
  loading: boolean;
  micros?: MicrosType;
} & SourceType;

// Обёртка над `HomeNutrientGlowCard` для экрана блюда/ингредиента (D-03,
// 6-й раунд коррекции) — заменяет старую `MealMicros`. Таргеты и цвета
// свечения те же, что на Главной; поведение Link у тайла "Качество"
// сохранено из старой `MealMicros` (зависит от `source`).
export default function MealNutrientTiles({
  source,
  id,
  loading,
  micros,
}: Props) {
  const targets = {
    score: 100,
    fiber: getTargets("carbs", "fiber")[1],
    sugar: getTargets("carbs", "sugar")[1],
    sodium: getTargets("minerals", "sodium")[1],
  };

  const nutrients = [
    {
      name: "Клетчатка",
      value: micros?.fiber ?? 0,
      target: targets.fiber,
      darkGlowColor: NUTRIENT_GLOW.fiber.dark,
      lightGlowColor: NUTRIENT_GLOW.fiber.light,
    },
    {
      name: "Сахар",
      value: micros?.sugar ?? 0,
      target: targets.sugar,
      darkGlowColor: NUTRIENT_GLOW.sugar.dark,
      lightGlowColor: NUTRIENT_GLOW.sugar.light,
    },
    {
      name: "Натрий",
      value: (micros?.sodium ?? 0) * 1000,
      target: targets.sodium,
      darkGlowColor: NUTRIENT_GLOW.sodium.dark,
      lightGlowColor: NUTRIENT_GLOW.sodium.light,
    },
  ];

  const scoreCard = (
    <HomeNutrientGlowCard
      name="Качество"
      value={micros?.score ?? 0}
      target={targets.score}
      size="lg"
      darkGlowColor={getColor("health", undefined, "dark")}
      lightGlowColor={getColor("health", 0.22, "light")}
    />
  );

  return (
    <View style={styles.container}>
      <WithSkeleton
        loading={loading}
        skeletonStyle={styles.bigSkeleton}
        containerStyle={styles.skeletonFlex}
      >
        <Link
          href={
            source === "meal"
              ? { pathname: "/app/(meal)/mealNutrients", params: { mealId: id } }
              : {
                  pathname: "/app/(mealItem)/mealItemNutrients",
                  params: { mealItemId: id },
                }
          }
          asChild
        >
          {scoreCard}
        </Link>
      </WithSkeleton>
      <View style={styles.cardsContainer}>
        {nutrients.map((nutrient) => (
          <WithSkeleton
            key={`meal-nutrient-tiles-${nutrient.name}`}
            loading={loading}
            skeletonStyle={styles.smallSkeleton}
            containerStyle={styles.skeletonFlex}
          >
            <HomeNutrientGlowCard
              name={nutrient.name}
              value={nutrient.value}
              target={nutrient.target}
              darkGlowColor={nutrient.darkGlowColor}
              lightGlowColor={nutrient.lightGlowColor}
            />
          </WithSkeleton>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingHorizontal: 16,
  },
  cardsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  skeletonFlex: {
    flex: 1,
  },
  bigSkeleton: {
    width: "100%",
    height: 120,
    borderRadius: 24,
  },
  smallSkeleton: {
    width: "100%",
    height: 90,
    borderRadius: 24,
  },
});
