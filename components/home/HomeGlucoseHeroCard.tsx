import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../ui/Text";
import { Doc } from "@/convex/_generated/dataModel";
import { GLUCOSE_ESTIMATE_CONSTANTS } from "@/lib/nutrition/estimateGlucoseFromMeals";
import type { GlucoseEstimate } from "@/lib/nutrition/estimateGlucoseFromMeals";
import type { GlucoseUnit } from "@/convex/observers/utils/thresholds";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

const TICK_COUNT = 14;
const TREND_WIDTH = 72;
const TREND_HEIGHT = 40;
const TICK_HEIGHT = 20;
const MARKER_WIDTH = 4;
const MARKER_BAR_HEIGHT = 22;
const MARKER_CARET_HEIGHT = 4;

function toMmol(value: number, unit: GlucoseUnit): number {
  return unit === "mg/dL"
    ? value / GLUCOSE_ESTIMATE_CONSTANTS.MGDL_PER_MMOL
    : value;
}

function formatValue(value: number, unit: GlucoseUnit): string {
  return unit === "mmol/L"
    ? (Math.round(value * 10) / 10).toString()
    : Math.round(value).toString();
}

type Props = {
  /** Последнее РЕАЛЬНОЕ показание сегодня, если есть — приоритет над
   * оценкой (см. estimateGlucoseFromMeals.ts). */
  currentReading?: Doc<"glucoseReadings"> | null;
  /** Оценка "≈" по еде — используется только если реального показания
   * сегодня ещё нет. */
  currentEstimate?: GlucoseEstimate | null;
  /** Плоский список РЕАЛЬНЫХ показаний за последние 7 дней (без оценок —
   * оценки принципиально не подмешиваются в недельное среднее/диапазон,
   * см. estimateGlucoseFromMeals.ts). Опционально: без этого пропа виджет
   * тренда/среднего скрывается, но карточка не ломается (экраны вне
   * скоупа этой волны). */
  weekReadings?: Doc<"glucoseReadings">[];
};

export default function HomeGlucoseHeroCard({
  currentReading,
  currentEstimate,
  weekReadings = [],
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  const current = currentReading
    ? { value: currentReading.value, unit: currentReading.unit, isEstimate: false }
    : currentEstimate
      ? { value: currentEstimate.value, unit: currentEstimate.unit, isEstimate: true }
      : null;

  const hasWeekData = weekReadings.length > 0;
  const weekMmolValues = weekReadings.map((r) => toMmol(r.value, r.unit));
  const weekAverageMmol = hasWeekData
    ? weekMmolValues.reduce((sum, v) => sum + v, 0) / weekMmolValues.length
    : null;
  const weekMinMmol = hasWeekData ? Math.min(...weekMmolValues) : null;
  const weekMaxMmol = hasWeekData ? Math.max(...weekMmolValues) : null;

  const displayUnit: GlucoseUnit = current?.unit ?? "mmol/L";
  const weekAverageDisplay =
    weekAverageMmol !== null
      ? formatValue(
          displayUnit === "mmol/L"
            ? weekAverageMmol
            : weekAverageMmol * GLUCOSE_ESTIMATE_CONSTANTS.MGDL_PER_MMOL,
          displayUnit
        )
      : null;

  // Позиция акцентного маркера на шкале тик-рисок — доля СРЕДНЕГО за
  // неделю значения внутри диапазона [min, max] той же недели (клэмп к
  // границам на случай погрешности округления). Уточнено пользователем
  // после ревью первой версии (была доля ТЕКУЩЕГО значения — неверно).
  let markerRatio: number | null = null;
  if (weekAverageMmol !== null && weekMinMmol !== null && weekMaxMmol !== null) {
    const range = weekMaxMmol - weekMinMmol;
    markerRatio =
      range > 0
        ? Math.min(1, Math.max(0, (weekAverageMmol - weekMinMmol) / range))
        : 0.5;
  }

  const textColor = getColor("foreground", undefined, theme);
  const mutedTextColor = getColor("foreground", 0.65, theme);
  const accentColor = getColor("primary", undefined, theme);

  return (
    <LinearGradient
      colors={getHeroGradientColors(theme)}
      locations={getHeroGradientLocations(theme)}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.card}
    >
      <Text size="16" weight="600" color={textColor}>
        Глюкоза
      </Text>

      <View style={styles.row}>
        <View style={styles.currentColumn}>
          <Text
            size="48"
            family="outfit"
            color={textColor}
            style={styles.currentValue}
          >
            {current ? `${current.isEstimate ? "≈ " : ""}${formatValue(current.value, current.unit)}` : "—"}
          </Text>
          <Text size="12" color={mutedTextColor}>
            {current ? current.unit : ""}
          </Text>
        </View>

        <View style={styles.trendColumn}>
          <View style={styles.trendWidget}>
            <View style={styles.tickRow}>
              {Array.from({ length: TICK_COUNT }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.tick,
                    { backgroundColor: getColor("foreground", 0.35, theme) },
                  ]}
                />
              ))}
            </View>
            {markerRatio !== null && (
              <View
                style={[
                  styles.marker,
                  { left: markerRatio * (TREND_WIDTH - MARKER_WIDTH) },
                ]}
              >
                <View
                  style={[
                    styles.markerCaret,
                    { borderBottomColor: accentColor },
                  ]}
                />
                <View
                  style={[styles.markerBar, { backgroundColor: accentColor }]}
                />
              </View>
            )}
          </View>
          <Text size="20" weight="600" family="outfit" color={textColor}>
            {weekAverageDisplay ?? "—"}
          </Text>
          <Text size="12" color={mutedTextColor}>
            сред/нед
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// Фиксированный декоративный градиент карточки-героя — литерально из Figma
// (node 840:5482), НЕ через getColor()/тему, та же осознанная конвенция
// исключения "всё через getColor", что и у HomeCalorieOverviewCard.tsx
// (см. её комментарий к `getCardGradientColors`). CSS-стоп 117.87% из Figma
// клэмпнут к 1.0 — видимый бокс не может отрисовать стоп за своими
// границами, дальнейшая часть градиента визуально не отличима от клэмпнутой.
// Светлая тема не имеет референса в Figma — собственная, более мягкая
// адаптация той же розово-бордовой гаммы, растворяющаяся в `base` (см.
// SUMMARY 07.1-07, 7-й раунд, для обоснования конкретных значений).
function getHeroGradientColors(theme: ThemeName): [string, string, string] {
  if (theme === "dark") {
    return ["rgb(72, 21, 52)", "rgb(190, 66, 125)", "rgb(193, 164, 189)"];
  }
  return [
    "rgba(190, 66, 125, 0.35)",
    "rgba(193, 164, 189, 0.28)",
    getColor("base", undefined, theme),
  ];
}

function getHeroGradientLocations(theme: ThemeName): [number, number, number] {
  return theme === "dark" ? [0.0667, 0.5024, 1] : [0, 0.55, 1];
}

const createStyles = (_theme: ThemeName) => ({
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 20,
    // Тёмная тема Figma-градиента сама по себе достаточно тёмная в верхней
    // части (rgb(72,21,52)) — отдельная база rgb(21,24,31) из спеки не даёт
    // заметной разницы под первым цветовым стопом на 6.67%, поэтому не
    // дублируется отдельным слоем, только сам трёхстоповый LinearGradient.
  },
  row: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-end" as const,
  },
  currentColumn: {
    gap: 2,
  },
  currentValue: {
    fontSize: 60,
    lineHeight: 64,
  },
  trendColumn: {
    alignItems: "flex-end" as const,
    gap: 4,
  },
  trendWidget: {
    width: TREND_WIDTH,
    height: TREND_HEIGHT,
    justifyContent: "flex-end" as const,
  },
  tickRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-end" as const,
    height: TICK_HEIGHT,
  },
  tick: {
    width: 2,
    height: TICK_HEIGHT,
    borderRadius: 1,
  },
  marker: {
    position: "absolute" as const,
    bottom: 0,
    width: MARKER_WIDTH,
    alignItems: "center" as const,
  },
  markerCaret: {
    width: 0,
    height: 0,
    borderLeftWidth: MARKER_WIDTH / 2,
    borderRightWidth: MARKER_WIDTH / 2,
    borderBottomWidth: MARKER_CARET_HEIGHT,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  markerBar: {
    width: 2,
    height: MARKER_BAR_HEIGHT,
    borderRadius: 1,
  },
});
