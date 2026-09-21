import { View } from "react-native";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import HomeNutrientGlowCard from "./HomeNutrientGlowCard";
import { Link } from "expo-router";
import { MicrosType } from "@/convex/tables/mealItems";
import { getTargets } from "@/config/nutrientsConfig";

// Литеральные фиксированные HEX/rgba из Figma-узла 813:918 (тёмная тема —
// точные значения из референса; светлая тема — собственная адаптация той же
// цветовой гаммы под светлый фон, у Figma нет светлого референса для этих
// тайлов). НЕ пропускать через getColor()/тему — см. UI-SPEC и
// 07.1-07-CORRECTION-3-SUMMARY.md для обоснования конкретных значений.
const NUTRIENT_GLOW = {
  fiber: { dark: "#56635E", light: "rgba(86, 99, 94, 0.28)" },
  sugar: { dark: "#C1A4BD", light: "rgba(193, 164, 189, 0.30)" },
  sodium: { dark: "#4772EB", light: "rgba(71, 114, 235, 0.22)" },
} as const;

type Micro = {
  name: string;
  value: number;
  target: number;
  darkGlowColor: string;
  lightGlowColor: string;
};

type Props = {
  totalMicros: MicrosType;
  dayIndex: number;
  readOnly?: boolean;
};

export default function HomeMicroSummary({
  totalMicros,
  dayIndex,
  readOnly = false,
}: Props) {
  const styles = useThemedStyles(createStyles);

  const targets = {
    score: 100,
    fiber: getTargets("carbs", "fiber")[1],
    sugar: getTargets("carbs", "sugar")[1],
    sodium: getTargets("minerals", "sodium")[1],
  };

  const micros: Micro[] = [
    {
      name: "Клетчатка",
      value: totalMicros.fiber,
      target: targets.fiber,
      darkGlowColor: NUTRIENT_GLOW.fiber.dark,
      lightGlowColor: NUTRIENT_GLOW.fiber.light,
    },
    {
      name: "Сахар",
      value: totalMicros.sugar,
      target: targets.sugar,
      darkGlowColor: NUTRIENT_GLOW.sugar.dark,
      lightGlowColor: NUTRIENT_GLOW.sugar.light,
    },
    {
      name: "Натрий",
      value: totalMicros.sodium * 1000,
      target: targets.sodium,
      darkGlowColor: NUTRIENT_GLOW.sodium.dark,
      lightGlowColor: NUTRIENT_GLOW.sodium.light,
    },
  ];

  // "Качество" — не в Figma; та же визуальная стилистика (плоский фон +
  // цветное свечение), но тон свечения берётся из смыслового токена
  // `health` (зелёный), а не из фиксированного Figma-hex — так решил
  // пользователь (п.3 user_decisions), это единственный тайл-исключение.
  const scoreCard = (
    <HomeNutrientGlowCard
      name="Качество"
      value={totalMicros.score}
      target={targets.score}
      size="lg"
      darkGlowColor={getColor("health", undefined, "dark")}
      lightGlowColor={getColor("health", 0.22, "light")}
    />
  );

  return (
    <View style={styles.container}>
      {readOnly ? (
        scoreCard
      ) : (
        <Link
          href={{ pathname: "/app/(home)/nutrients", params: { dayIndex } }}
          asChild
        >
          {scoreCard}
        </Link>
      )}
      <View style={styles.cardsContainer}>
        {micros.map((nutrient) => (
          <HomeNutrientGlowCard
            key={`micro-summary-${nutrient.name}`}
            name={nutrient.name}
            value={nutrient.value}
            target={nutrient.target}
            darkGlowColor={nutrient.darkGlowColor}
            lightGlowColor={nutrient.lightGlowColor}
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
