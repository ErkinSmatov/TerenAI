import { View } from "react-native";
import Text from "../ui/Text";
import Card from "../ui/Card";
import Button from "../ui/Button";
import SafeArea from "../ui/SafeArea";
import WarningBadge from "../ui/WarningBadge";
import SugarByHourChart from "../charts/SugarByHourChart";
import HomeGlucoseHeroCard from "./HomeGlucoseHeroCard";
import HomeGlucoseRangeTile from "./HomeGlucoseRangeTile";
import { Doc } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import { Link } from "expo-router";
import { isGlucoseOutOfRange } from "@/convex/observers/utils/thresholds";
import { GlucoseEstimate } from "@/lib/nutrition/estimateGlucoseFromMeals";
import { useThemeContext } from "@/context/ThemeContext";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import type { ThemeName } from "@/lib/ui/palettes";

type MealForChart = Pick<
  Doc<"meals">,
  "_id" | "_creationTime" | "totalNutrients"
>;

type Props = {
  readings: Doc<"glucoseReadings">[];
  readOnly?: boolean;
  estimate?: GlucoseEstimate | null;
  /** Плоский список реальных показаний за последние 7 дней — для
   * недельного среднего и тик-виджета тренда в `HomeGlucoseHeroCard`, а
   * также как контекст baseline/unit для оценки по еде в часах без
   * собственного реального замера. Опционально: без пропа виджет тренда
   * скрывает недельное среднее, а часовой график не может строить
   * carried-forward/оценочные бары дальше своего дня (экраны вне скоупа
   * этой волны — Дневник-детали, наблюдатель). */
  weekReadings?: Doc<"glucoseReadings">[];
  /** Приёмы пищи выбранного дня — маркеры на часовом графике и источник
   * оценки по еде для часов без реального показания. */
  meals?: MealForChart[];
  /** Локальная полночь (мс) выбранного дня — см. `SugarByHourChart`. */
  dayStart?: number;
};

export default function HomeGlucoseSummary({
  readings,
  readOnly = false,
  estimate,
  weekReadings = [],
  meals = [],
  dayStart,
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  const isOutOfRange =
    readings.length > 0
      ? readings.some((reading) =>
          isGlucoseOutOfRange(reading.value, reading.unit, reading.context)
        )
      : estimate
        ? isGlucoseOutOfRange(estimate.value, estimate.unit, "afterMeal")
        : false;

  // Последнее реальное показание сегодня — `readings` приходит
  // отсортированным по убыванию `recordedAt` (см. `getWeekReadings`),
  // так же, как раньше использовалось для списка последних показаний.
  const currentReading = readings.length > 0 ? readings[0] : null;

  // Низкий/Высокий — строго по реальным показаниям СЕГОДНЯШНЕГО дня, без
  // оценок и без carried-forward значений графика (те не измерения, см.
  // estimateGlucoseFromMeals.ts). Пустое состояние при отсутствии
  // показаний за день — тайлы скрываются целиком (у Figma нет спека для
  // пустого состояния этих тайлов).
  const todayValues = readings.map((reading) => reading.value);
  const hasTodayReadings = todayValues.length > 0;
  const todayUnit = hasTodayReadings ? readings[0].unit : "mmol/L";
  const todayMin = hasTodayReadings ? Math.min(...todayValues) : null;
  const todayMax = hasTodayReadings ? Math.max(...todayValues) : null;

  const hasContent = readings.length > 0 || Boolean(estimate);

  const cardContent = (
    <View style={styles.stack}>
      <Card style={styles.chartCard}>
        {hasContent ? (
          <SugarByHourChart
            readings={readings}
            meals={meals}
            dayStart={dayStart}
            baselineReadings={weekReadings}
          />
        ) : (
          <Text
            size="14"
            color={getColor("mutedForeground", 0.5, theme)}
            style={styles.empty}
          >
            Добавьте показание, чтобы увидеть его здесь&hellip;
          </Text>
        )}
        {isOutOfRange && <WarningBadge text="Глюкоза вне нормы" color="red" />}
      </Card>

      <HomeGlucoseHeroCard
        currentReading={currentReading}
        currentEstimate={estimate}
        weekReadings={weekReadings}
      />

      {hasTodayReadings && (
        <View style={styles.tilesRow}>
          <HomeGlucoseRangeTile
            label="Низкий"
            value={todayMin}
            unit={todayUnit}
            direction="low"
          />
          <HomeGlucoseRangeTile
            label="Высокий"
            value={todayMax}
            unit={todayUnit}
            direction="high"
          />
        </View>
      )}
    </View>
  );

  return (
    <SafeArea edges={["left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text size="20" weight="600">
          Сахар
        </Text>
        {!readOnly && (
          <Link href="/app/(home)/glucoseLog" asChild>
            <Button variant="text" size="sm">
              Все
            </Button>
          </Link>
        )}
      </View>

      {readOnly ? (
        cardContent
      ) : (
        <Link href="/app/(home)/glucoseLog" asChild>
          <Button variant="base" size="base">
            {cardContent}
          </Button>
        </Link>
      )}
    </SafeArea>
  );
}

const createStyles = (_theme: ThemeName) => ({
  safeArea: {
    flex: 0,
    backgroundColor: "transparent",
    paddingTop: 32,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingBottom: 16,
  },
  stack: {
    gap: 16,
  },
  chartCard: {
    gap: 16,
  },
  empty: {
    textAlign: "center" as const,
    paddingVertical: 8,
  },
  tilesRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
});
