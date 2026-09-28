import Text from "@/components/ui/Text";
import { Doc } from "@/convex/_generated/dataModel";
import {
  isGlucoseOutOfRange,
  type GlucoseUnit,
} from "@/convex/observers/utils/thresholds";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import estimateGlucoseFromMeals, {
  type EstimateMealInput,
  type EstimateReadingInput,
} from "@/lib/nutrition/estimateGlucoseFromMeals";
import {
  Canvas,
  Group,
  LinearGradient,
  Path,
  Skia,
  vec,
  type SkPath,
} from "@shopify/react-native-skia";
import { UtensilsIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

const HOURS = 24;
const GAP = 4; // токен spacing xs
const BAR_RADIUS = 4;
const HOUR_LABEL_STEP = 3;
const HOUR_MS = 60 * 60 * 1000;
const MARKER_SIZE = 14;
const MARKER_ROW_HEIGHT = 20;

// Свечение-бейдж приёма пищи — литеральный фиксированный акцент-лайм из
// Figma (узел 840:5482), НЕ через getColor()/тему: тот же приём "фиксированный
// декоративный figma-цвет", что и CALORIE_RING_GRADIENT в
// HomeCalorieOverviewCard.tsx. Иконка внутри — тёмная, для контраста на
// светлом лайме в обеих темах.
const MEAL_MARKER_COLOR = "#C9F14C";
const MEAL_MARKER_ICON_COLOR = "#151810";

type MealForChart = Pick<
  Doc<"meals">,
  "_id" | "_creationTime" | "totalNutrients"
>;

type HourBucket = {
  hour: number;
  value: number;
  unit: GlucoseUnit;
  outOfRange: boolean;
  /** false для перенесённого вперёд последнего реального значения или для
   * оценки по еде (`estimateGlucoseFromMeals`) — влияет только на
   * непрозрачность заливки бара, не участвует ни в каких агрегатах. */
  real: boolean;
} | null;

type Props = {
  readings: Doc<"glucoseReadings">[];
  /** Приёмы пищи выбранного дня — используются для маркеров-иконок над
   * баром часа приёма и, при отсутствии более ранних реальных показаний в
   * этот день, для оценочного (не реального) значения бара по
   * `estimateGlucoseFromMeals`. Опционально: экраны вне скоупа этой волны
   * (Дневник-детали, наблюдатель) могут не передавать этот проп — тогда
   * маркеры/оценочные бары просто не рендерятся, разрывов не будет. */
  meals?: MealForChart[];
  /** Локальная полночь (мс) дня, который рисует график — нужна, чтобы
   * привязать часовые бакеты и синтетическое "сейчас" для
   * `estimateGlucoseFromMeals` к конкретному дню, а не к текущему моменту.
   * Опционально по той же причине, что и `meals`. */
  dayStart?: number;
  /** Более широкое окно реальных показаний (напр. неделя) для разрешения
   * baseline/unit внутри `estimateGlucoseFromMeals` — та же оценка не
   * персистится и не участвует в агрегатах, только baseline-контекст.
   * По умолчанию используется `readings`. */
  baselineReadings?: EstimateReadingInput[];
  height?: number;
};

export default function SugarByHourChart({
  readings,
  meals = [],
  dayStart,
  baselineReadings,
  height = 120,
}: Props) {
  const { theme } = useThemeContext();
  const [measured, setMeasured] = useState(0);

  const onLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const next = Math.ceil(nativeEvent.layout.width);
    if (next && next !== measured) setMeasured(next);
  };

  const mealHours = useMemo(() => {
    const hours = new Set<number>();
    for (const meal of meals) {
      hours.add(new Date(meal._creationTime).getHours());
    }
    return hours;
  }, [meals]);

  const buckets = useMemo<HourBucket[]>(() => {
    const groups: Doc<"glucoseReadings">[][] = Array.from(
      { length: HOURS },
      () => []
    );

    for (const reading of readings) {
      const hour = new Date(reading.recordedAt).getHours();
      groups[hour].push(reading);
    }

    const realBuckets: HourBucket[] = groups.map((group, hour) => {
      if (group.length === 0) return null;

      const average =
        group.reduce((sum, reading) => sum + reading.value, 0) / group.length;

      const outOfRange = group.some((reading) =>
        isGlucoseOutOfRange(reading.value, reading.unit, reading.context)
      );

      return {
        hour,
        value: average,
        unit: group[0].unit,
        outOfRange,
        real: true,
      };
    });

    if (dayStart === undefined) return realBuckets;

    // Отсортированные по времени реальные показания дня — источник для
    // "переноса вперёд" (carried-forward, шаговая CGM-имитация) значения в
    // часы без собственного реального замера.
    const sortedReadings = [...readings].sort(
      (a, b) => a.recordedAt - b.recordedAt
    );
    const estimateBaseline: EstimateReadingInput[] =
      baselineReadings ?? readings;

    // Верхняя граница часов, для которых вообще имеет смысл считать
    // fallback-значение: реальное "сейчас", но не позже конца дня графика.
    // Без этой границы часы, которые ещё не наступили (например, 23:00 при
    // текущем времени 12:46), заполнялись бы перенесённым вперёд значением
    // наравне с уже прошедшими — баг, замеченный пользователем на скрине
    // ("показывает заполненное значение наперёд"). Для дней в прошлом
    // (dayStart + 24ч уже в прошлом) граница естественно равна концу того
    // дня — там заполняются все 24 часа, как и раньше.
    const fallbackHorizon = Math.min(Date.now(), dayStart + HOURS * HOUR_MS);

    return realBuckets.map((bucket, hour) => {
      if (bucket) return bucket;

      const hourStart = dayStart + hour * HOUR_MS;
      const hourEnd = hourStart + HOUR_MS;

      if (hourStart >= fallbackHorizon) return null;

      // (a) Перенос вперёд последнего реального показания ЭТОГО дня, если
      // оно было раньше начала часа.
      let carriedForward: Doc<"glucoseReadings"> | null = null;
      for (const reading of sortedReadings) {
        if (reading.recordedAt >= hourStart) break;
        carriedForward = reading;
      }
      if (carriedForward) {
        return {
          hour,
          value: carriedForward.value,
          unit: carriedForward.unit,
          outOfRange: isGlucoseOutOfRange(
            carriedForward.value,
            carriedForward.unit,
            carriedForward.context
          ),
          real: false,
        };
      }

      // (b) Ещё нет ни одного реального показания в этот день — оценка по
      // еде, съеденной в этот час или раньше. Оценка НИКОГДА не пишется в
      // реальные показания и не участвует в агрегатах — см. комментарий
      // estimateGlucoseFromMeals.ts.
      const mealsBeforeHourEnd: EstimateMealInput[] = meals.filter(
        (meal) => meal._creationTime < hourEnd
      );
      if (mealsBeforeHourEnd.length === 0) return null;

      const estimate = estimateGlucoseFromMeals(
        mealsBeforeHourEnd,
        estimateBaseline,
        hourEnd
      );
      if (!estimate) return null;

      return {
        hour,
        value: estimate.value,
        unit: estimate.unit,
        outOfRange: isGlucoseOutOfRange(estimate.value, estimate.unit, "afterMeal"),
        real: false,
      };
    });
  }, [readings, meals, dayStart, baselineReadings]);

  const maxValue = useMemo(() => {
    const values = buckets
      .filter((bucket): bucket is NonNullable<HourBucket> => bucket !== null)
      .map((bucket) => bucket.value);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [buckets]);

  const barWidth =
    measured > 0 ? (measured - GAP * (HOURS - 1)) / HOURS : 0;

  const { trackPath, barPaths } = useMemo(() => {
    if (!measured || !barWidth) {
      return {
        trackPath: null,
        barPaths: [] as {
          path: SkPath;
          outOfRange: boolean;
          real: boolean;
          y: number;
          barHeight: number;
        }[],
      };
    }

    const track = Skia.Path.Make();
    const bars: {
      path: SkPath;
      outOfRange: boolean;
      real: boolean;
      y: number;
      barHeight: number;
    }[] = [];

    for (let hour = 0; hour < HOURS; hour++) {
      const x = hour * (barWidth + GAP);

      track.addRRect({
        rect: { x, y: 0, width: barWidth, height },
        rx: BAR_RADIUS,
        ry: BAR_RADIUS,
      });

      const bucket = buckets[hour];
      if (!bucket || maxValue <= 0) continue;

      const barHeight = Math.max(
        (bucket.value / maxValue) * height,
        BAR_RADIUS * 2
      );
      const y = height - barHeight;

      const barPath = Skia.Path.Make();
      barPath.addRRect({
        rect: { x, y, width: barWidth, height: barHeight },
        rx: BAR_RADIUS,
        ry: BAR_RADIUS,
      });
      bars.push({
        path: barPath,
        outOfRange: bucket.outOfRange,
        real: bucket.real,
        y,
        barHeight,
      });
    }

    return { trackPath: track, barPaths: bars };
  }, [measured, barWidth, buckets, maxValue, height]);

  const trackColor = getColor("secondary", 0.08, theme);
  const labelColor = getColor("mutedForeground", undefined, theme);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {measured > 0 && meals.length > 0 && (
        <View style={styles.markerRow}>
          {Array.from(mealHours).map((hour) => (
            <View
              key={`meal-${hour}`}
              style={[
                styles.marker,
                {
                  left:
                    hour * (barWidth + GAP) + barWidth / 2 - MARKER_SIZE / 2,
                },
              ]}
            >
              <UtensilsIcon
                size={8}
                color={MEAL_MARKER_ICON_COLOR}
                strokeWidth={2.5}
              />
            </View>
          ))}
        </View>
      )}
      <Canvas style={{ width: measured, height }}>
        <Group>
          {trackPath && <Path path={trackPath} style="fill" color={trackColor} />}
          {barPaths.map((bar, i) => {
            // Непрозрачность 0.5 для НЕ-реальных (перенесённых/оценочных)
            // баров — тот же "≈"-приём непрозрачности, что и у оценки в
            // остальном приложении, чтобы отличить измеренное от
            // предполагаемого. Цвет заливки — "foreground" (белый/светлый
            // в обеих темах), как в Figma (`#fffefd`), а не акцентный
            // лайм-primary — по замечанию пользователя после ревью.
            const opacity = bar.real ? undefined : 0.5;
            const fillColor = getColor("foreground", opacity, theme);

            if (!bar.outOfRange) {
              return (
                <Path key={i} path={bar.path} style="fill" color={fillColor} />
              );
            }

            // Красный градиент сверху для баров вне нормы (Figma:
            // linear-gradient(#E94545 → нормальный цвет заливки на ~35%
            // высоты бара). `destructive` в тёмной палитре буквально равен
            // #E94545, поэтому берём его через getColor (темизируемо), а
            // не как отдельный литерал.
            const topColor = getColor("destructive", opacity, theme);
            return (
              <Path key={i} path={bar.path} style="fill">
                <LinearGradient
                  start={vec(0, bar.y)}
                  end={vec(0, bar.y + bar.barHeight)}
                  colors={[topColor, fillColor, fillColor]}
                  positions={[0, 0.35, 1]}
                />
              </Path>
            );
          })}
        </Group>
      </Canvas>
      {measured > 0 && (
        <View style={styles.labels}>
          {Array.from({ length: HOURS }, (_, hour) => hour)
            .filter((hour) => (hour + 1) % HOUR_LABEL_STEP === 0)
            .map((hour) => (
              <Text
                key={hour}
                size="12"
                family="outfit"
                color={labelColor}
                style={{
                  position: "absolute",
                  left: hour * (barWidth + GAP),
                  width: barWidth * HOUR_LABEL_STEP,
                }}
              >
                {hour + 1}:00
              </Text>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  markerRow: {
    height: MARKER_ROW_HEIGHT,
  },
  marker: {
    position: "absolute",
    bottom: 0,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: MEAL_MARKER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  labels: {
    height: 16,
    marginTop: 4,
  },
});
