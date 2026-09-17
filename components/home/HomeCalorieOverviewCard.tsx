import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { FootprintsIcon } from "lucide-react-native";
import Text from "../ui/Text";
import CircularProgress from "../ui/CircularProgress";
import { Doc } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import getShadow from "@/lib/ui/getShadow";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import calcRatio from "@/lib/utils/calcRatio";

// Figma node 863:5405 не задаёт шаговую цель — в проекте вообще нет
// конфига дневной цели по шагам (в отличие от целей по калориям/БЖУ).
// Claude's Discretion: используем фиксированное значение 10000 только для
// заполнения прогресс-бара шагов. Кандидат на будущий конфиг (например,
// профильную настройку), если в проекте появится персонализация цели.
const DEFAULT_STEPS_GOAL = 10000;

type MacroRow = {
  name: string;
  value: number;
  target: number;
  color: string;
};

type Props = {
  calories: {
    value: number;
    target: number;
  };
  // Порядок фиксирован по Figma-макету: Белки, Жиры, Углеводы.
  macros: [MacroRow, MacroRow, MacroRow];
  // Опционально: экраны вне скоупа этой волны (Дневник, наблюдатель) вызывают
  // родителя (`HomeMacroSummary`) без этого пропа — им пока рендерится
  // отдельная `HomeMovementSummary` рядом, как раньше.
  movement?: Doc<"movementData"> | null;
  progress: SharedValue<number>;
};

type BarProps = {
  ratio: number;
  progress: SharedValue<number>;
  color: string;
  trackColor: string;
  trackHeight: number;
  fillHeight: number;
};

function ProgressBar({
  ratio,
  progress,
  color,
  trackColor,
  trackHeight,
  fillHeight,
}: BarProps) {
  const animatedRatio = useSharedValue(ratio);

  useEffect(() => {
    animatedRatio.value = withTiming(ratio, { duration: 750 });
  }, [ratio, animatedRatio]);

  const itemProgress = useDerivedValue(
    () => animatedRatio.value * progress.value
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, itemProgress.value)) * 100}%`,
  }));

  return (
    <View
      style={[
        barStyles.barTrack,
        {
          height: trackHeight,
          borderRadius: trackHeight / 2,
          backgroundColor: trackColor,
        },
      ]}
    >
      <Animated.View
        style={[
          barStyles.barFill,
          {
            height: fillHeight,
            borderRadius: fillHeight / 2,
            backgroundColor: color,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

export default function HomeCalorieOverviewCard({
  calories,
  macros,
  movement = null,
  progress,
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  const caloriesRatio = calcRatio(calories.value, calories.target);
  const animatedCaloriesRatio = useSharedValue(caloriesRatio);

  useEffect(() => {
    animatedCaloriesRatio.value = withTiming(caloriesRatio, { duration: 750 });
  }, [caloriesRatio, animatedCaloriesRatio]);

  const ringProgress = useDerivedValue(
    () => animatedCaloriesRatio.value * progress.value
  );

  // Тот же контракт токенов, что и у существующих колец на Главной
  // (`HomeSummaryCardBig`/`HomeSummaryCard`): «в норме» — акцентный цвет
  // темы (реестр UI-SPEC явно резервирует акцент под «progress fill для
  // шагов и „on-track“ сегмент кольца калорий»), «выше цели» — destructive.
  const ringColor =
    caloriesRatio > 1
      ? getColor("destructive", undefined, theme)
      : getColor("primary", undefined, theme);
  const trackColor = getColor("foreground", 0.12, theme);

  const remaining = Math.round(calories.target - calories.value);

  const steps = movement?.steps ?? 0;
  const distanceKm = movement ? movement.distanceMeters / 1000 : 0;
  const stepsRatio = calcRatio(steps, DEFAULT_STEPS_GOAL);
  const stepsFillColor = getColor("primary", undefined, theme);

  return (
    <LinearGradient
      colors={getCardGradientColors(theme)}
      locations={[0.0342, 0.5264]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.9 }}
      style={styles.card}
    >
      <Text size="16" weight="600">
        Калории
      </Text>

      <View style={styles.middleRow}>
        <View style={styles.ringColumn}>
          <CircularProgress
            progress={ringProgress}
            color={ringColor}
            trackColor={trackColor}
            strokeWidth={8}
            size={132}
          />
          <View style={styles.ringCenter} pointerEvents="none">
            <Text size="40" family="outfit">
              {remaining}
            </Text>
            <Text size="12" color={getColor("foreground", 0.6, theme)}>
              Осталось
            </Text>
          </View>
        </View>

        <View style={styles.macrosColumn}>
          {macros.map((macro) => {
            const ratio = calcRatio(macro.value, macro.target);
            return (
              <View key={`calorie-overview-macro-${macro.name}`} style={styles.macroRow}>
                <View style={styles.macroHeaderRow}>
                  <Text
                    size="12"
                    weight="600"
                    color={getColor("foreground", 0.65, theme)}
                  >
                    {macro.name}
                  </Text>
                  <View style={styles.macroValueRow}>
                    <Text size="20" weight="600" family="outfit">
                      {Math.round(macro.value)}
                    </Text>
                    <Text
                      size="12"
                      family="outfit"
                      color={getColor("foreground", 0.45, theme)}
                    >
                      /{macro.target}
                    </Text>
                  </View>
                </View>
                <ProgressBar
                  ratio={ratio}
                  progress={progress}
                  color={macro.color}
                  trackColor={trackColor}
                  trackHeight={9}
                  fillHeight={5}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.bottomItem}>
          <Text size="12" color={getColor("foreground", 0.65, theme)}>
            Всего
          </Text>
          <Text size="20" weight="600" family="outfit">
            {Math.round(calories.target)}
          </Text>
        </View>

        <View style={styles.stepsBlock}>
          <View style={styles.stepsHeaderRow}>
            <FootprintsIcon
              size={20}
              color={getColor("foreground", 0.65, theme)}
            />
            <Text size="12" weight="600" family="outfit">
              {steps.toLocaleString("ru-RU")}
            </Text>
          </View>
          <View style={styles.stepsBarRow}>
            <ProgressBar
              ratio={stepsRatio}
              progress={progress}
              color={stepsFillColor}
              trackColor={trackColor}
              trackHeight={3}
              fillHeight={3}
            />
            <Text
              size="12"
              family="outfit"
              color={getColor("foreground", 0.45, theme)}
              style={styles.stepsDistanceText}
            >
              {distanceKm.toFixed(1)} км
            </Text>
          </View>
        </View>

        <View style={[styles.bottomItem, styles.bottomItemRight]}>
          <Text size="12" color={getColor("foreground", 0.65, theme)}>
            Съедено
          </Text>
          <Text size="20" weight="600" family="outfit">
            {Math.round(calories.value)}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// Тёмная тема воспроизводит фирменный оранжево-тёмный градиент из Figma
// (node 863:5405) буквально — это декоративный ассет карточки, а не
// семантический токен, поэтому не берётся из палитры. Светлая тема не имеет
// референса в Figma — по решению пользователя (чекпоинт D-03) сделан
// собственный светлый эквивалент того же «оранжевого» фирменного акцента:
// тёплый оранжевый тон (совпадающий с токеном `orange`) на 22% непрозрачности
// в углу, растворяющийся в цвете поверхности (`base`) по той же диагонали.
function getCardGradientColors(theme: ThemeName): [string, string] {
  if (theme === "dark") {
    return ["rgb(192, 91, 23)", "rgb(27, 27, 27)"];
  }
  return ["rgba(249, 115, 22, 0.22)", getColor("base", undefined, theme)];
}

const createStyles = (theme: ThemeName) => ({
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: getColor("secondary", theme === "dark" ? 0.08 : undefined, theme),
    ...getShadow("sm"),
  },
  middleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  ringColumn: {
    width: 132,
    height: 132,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  macrosColumn: {
    flex: 1,
    gap: 16,
  },
  macroRow: {
    gap: 6,
  },
  macroHeaderRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-end" as const,
  },
  macroValueRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
  },
  bottomRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "space-between" as const,
  },
  bottomItem: {
    gap: 4,
  },
  bottomItemRight: {
    alignItems: "flex-end" as const,
  },
  stepsBlock: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 6,
  },
  stepsHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  stepsBarRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  stepsDistanceText: {
    flexShrink: 0,
  },
});

const barStyles = StyleSheet.create({
  barTrack: {
    width: "100%",
    justifyContent: "center",
  },
  barFill: {
    position: "absolute",
    left: 0,
  },
});
