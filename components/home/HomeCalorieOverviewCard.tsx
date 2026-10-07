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
import Text from "../ui/Text";
import CircularProgress from "../ui/CircularProgress";
import getColor from "@/lib/ui/getColor";
import getShadow from "@/lib/ui/getShadow";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import calcRatio from "@/lib/utils/calcRatio";

// Фиксированные декоративные градиенты/цвета этой карточки — буквально из
// Figma (node 863:5405), НЕ через getColor()/тему и НЕ завязаны на статус
// "план/перебор". Это осознанное отступление от обычной конвенции проекта
// «всё через getColor», зафиксированное пользователем на чекпоинте D-03
// (2-й раунд коррекции), — одинаковые в светлой и тёмной теме. Ранее кольцо
// калорий и бар шагов брали цвет из акцентного токена темы (см. предыдущую
// версию `07.1-UI-SPEC.md`); эта прямая инструкция пользователя более свежая
// и более специфичная — она побеждает, и раздел UI-SPEC обновлён вместе с
// этим коммитом, чтобы не вводить в заблуждение будущего читателя.
const CALORIE_RING_GRADIENT: [string, string] = ["#EE6A22", "#FEE8D9"];
// Радиус/border-width для "ручки"-скраббера в конце дуги — точный px не был
// задан пользователем текстом (Figma-файл недоступен этому агенту напрямую);
// Claude's Discretion: подобран пропорционально strokeWidth кольца (8px) для
// комфортного визуального перекрытия конца обводки.
const CALORIE_RING_END_CAP = {
  color: "#F19062",
  borderColor: "#FFFFFF",
  borderWidth: 2,
  radius: 8,
};

type MacroRow = {
  name: string;
  value: number;
  target: number;
  // Фиксированный декоративный градиент (Figma node 863:5405), НЕ через
  // getColor()/тему — см. `HomeMacroSummary.tsx` для точных значений и
  // обоснования этого осознанного отступления от обычной конвенции проекта.
  gradientColors: [string, string];
};

type Props = {
  calories: {
    value: number;
    target: number;
  };
  // Порядок фиксирован по Figma-макету: Белки, Жиры, Углеводы.
  macros: [MacroRow, MacroRow, MacroRow];
  progress: SharedValue<number>;
};

type BarProps = {
  ratio: number;
  progress: SharedValue<number>;
  gradientColors: [string, string];
  trackColor: string;
  trackHeight: number;
  fillHeight: number;
};

// Animated-обёртка над `expo-linear-gradient`'s LinearGradient — тот же
// приём, что и для фона карточки (см. рендер ниже), только с
// `Animated.createAnimatedComponent`, чтобы существующая width-анимация
// (`fillStyle`, производная от `itemProgress`) продолжала плавно работать
// поверх градиентной заливки вместо плоского цвета.
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function ProgressBar({
  ratio,
  progress,
  gradientColors,
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
      <AnimatedLinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          barStyles.barFill,
          {
            height: fillHeight,
            borderRadius: fillHeight / 2,
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

  const trackColor = getColor("foreground", 0.12, theme);

  const remaining = Math.round(calories.target - calories.value);

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
            gradientColors={CALORIE_RING_GRADIENT}
            endCap={CALORIE_RING_END_CAP}
            trackColor={trackColor}
            strokeWidth={8}
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
                  gradientColors={macro.gradientColors}
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
  // Колонка кольца и колонка макросов делят среднюю строку карточки строго
  // 50/50 (оба flex: 1) — по прямой инструкции пользователя (D-03,
  // 2-й раунд коррекции), вместо прежней фиксированной ширины 132px.
  // aspectRatio: 1 держит колонку квадратной: высота выводится из ширины,
  // которую эта колонка получает от flex-раскладки строки.
  ringColumn: {
    flex: 1,
    aspectRatio: 1,
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
