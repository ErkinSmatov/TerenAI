import CircularProgress from "@/components/ui/CircularProgress";
import Description from "@/components/ui/Description";
import Text from "@/components/ui/Text";
import Title from "@/components/ui/Title";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import getNutrientGlow from "@/lib/ui/getNutrientGlow";
import {
  MACRO_TILE_DARK_BACKGROUND,
  MACRO_TILE_STYLES,
  type MacroTileStyle,
} from "@/lib/ui/macroTileStyles";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import AnimateableText from "react-native-animateable-text";
import { useAnimatedProps, useDerivedValue } from "react-native-reanimated";
import OnboardingStep from "../../OnboardingStep";
import macrosToKcal from "@/lib/utils/macrosToKcal";
import calcRatio from "@/lib/utils/calcRatio";
import resolveFontFamily from "@/lib/ui/resolveFontFamily";
import { useOnboardingContext } from "@/context/OnboardingContext";
import PlanInfoSheet from "./PlanInfoSheet";
import useProgress from "@/lib/hooks/reanimated/useProgress";

type MacroCardProps = MacroTileStyle & {
  name: string;
  amount: number;
  ratio: number;
  formatAmount: (amount: number) => string;
};

// Плитка в том же виде, что на экране «Настроить цели» (adjustMacroTargets):
// плоский фон, цветное свечение, кольцо с градиентом, число и название внутри.
function MacroCard({
  name,
  amount,
  ratio,
  formatAmount,
  ringColors,
  glow,
}: MacroCardProps) {
  const { theme } = useThemeContext();
  const progress = useProgress();
  const progressRatio = useDerivedValue(() => ratio * progress.value);

  const animatedProps = {
    weightText: useAnimatedProps(() => ({
      text: formatAmount(Math.round(amount * progress.value)),
    })),
  };

  return (
    <View
      style={[
        styles.macroCard,
        {
          backgroundColor:
            theme === "dark"
              ? MACRO_TILE_DARK_BACKGROUND
              : getColor("base", undefined, theme),
        },
        getNutrientGlow(theme, glow.dark, glow.light),
      ]}
    >
      <View style={styles.ring}>
        <CircularProgress
          progress={progressRatio}
          gradientColors={ringColors[theme]}
          trackColor={getColor("foreground", 0.12, theme)}
          strokeWidth={8}
        />
      </View>
      <View style={styles.center} pointerEvents="none">
        <AnimateableText
          animatedProps={animatedProps.weightText}
          style={[
            styles.macroAmountText,
            { color: getColor("foreground", undefined, theme) },
          ]}
        />
        <Text size="12" color={getColor("foreground", 0.6, theme)}>
          {name}
        </Text>
      </View>
    </View>
  );
}

export default function OnboardingPlan() {
  const { targets } = useOnboardingContext();
  const { calories, carbs, protein, fat } = targets;

  const macros = useMemo(
    () => [
      {
        name: "Калории",
        amount: calories,
        ratio: 1,
        ...MACRO_TILE_STYLES.calories,
        formatAmount: (amount: number) => {
          "worklet";
          return `${Math.round(amount)}`;
        },
      },
      {
        name: "Углеводы",
        amount: carbs,
        ratio: calcRatio(macrosToKcal({ carbs }), calories),
        ...MACRO_TILE_STYLES.carbs,
        formatAmount: (amount: number) => {
          "worklet";
          return `${Math.round(amount)}g`;
        },
      },
      {
        name: "Белки",
        amount: protein,
        ratio: calcRatio(macrosToKcal({ protein }), calories),
        ...MACRO_TILE_STYLES.protein,
        formatAmount: (amount: number) => {
          "worklet";
          return `${Math.round(amount)}g`;
        },
      },
      {
        name: "Жиры",
        amount: fat,
        ratio: calcRatio(macrosToKcal({ fat }), calories),
        ...MACRO_TILE_STYLES.fat,
        formatAmount: (amount: number) => {
          "worklet";
          return `${Math.round(amount)}g`;
        },
      },
    ],
    [calories, carbs, protein, fat]
  );

  return (
    <OnboardingStep title="Поздравляем! Ваш персональный план готов">
      <View style={styles.container}>
        <View style={styles.recommendationsContainer}>
          <View style={styles.header}>
            <PlanInfoSheet />
            <Title size="18" style={{ marginRight: 22 }}>
              Дневные рекомендации
            </Title>
            <Description size="14">
              Вы можете изменить их в любой момент
            </Description>
          </View>
          <View style={styles.macrosContainer}>
            {Array(2)
              .fill(0)
              .map((_, i) => (
                <View key={`macro-row-${i}`} style={styles.macroRow}>
                  {macros.slice(i * 2, i * 2 + 2).map((item) => (
                    <MacroCard
                      key={`macros-${item.name}-${item.amount}`}
                      {...item}
                    />
                  ))}
                </View>
              ))}
          </View>
        </View>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationsContainer: {
    width: "100%",
  },
  header: {
    gap: 2,
    paddingBottom: 24,
  },
  macrosContainer: {
    gap: 12,
  },
  macroRow: {
    flexDirection: "row",
    gap: 12,
  },
  macroCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 24,
    padding: 14,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    margin: 14,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  macroAmountText: {
    fontSize: 36,
    lineHeight: 42,
    textAlign: "center",
    fontFamily: resolveFontFamily({ family: "outfit" }),
    includeFontPadding: false,
  },
});
