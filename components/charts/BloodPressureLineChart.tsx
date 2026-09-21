import Text from "@/components/ui/Text";
import { Doc } from "@/convex/_generated/dataModel";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  LinearGradient,
  Path,
  Skia,
  vec,
  type SkPath,
} from "@shopify/react-native-skia";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

const VERTICAL_PADDING = 10;
const STROKE_WIDTH = 2;
const DOT_RADIUS = 3.5;
const DOT_BORDER_WIDTH = 1;
const Y_LABEL_COUNT = 3;
const X_LABEL_COUNT = 4;
const VERTICAL_GUIDE_COUNT = 6;
const LABELS_HEIGHT = 16;
const Y_LABELS_WIDTH = 28;

// Figma node 822:5258 ("BarLineChart") — цвет систолической линии буквально
// из дизайна (#8979FF), НЕ через getColor()/тему, как и остальные литеральные
// figma-цвета этой фазы (см. HomeCalorieOverviewCard.tsx). Диастолическая —
// собственный подбор (см. 07.1-07-CORRECTION-4-SUMMARY.md): тёплый коралл,
// который читается рядом с фиолетовым на обеих темах и не сливается с ним.
const SYSTOLIC_COLOR = "#8979FF";
const DIASTOLIC_COLOR = "#FF8A65";

type Props = {
  readings: Doc<"bloodPressureReadings">[];
  height?: number;
};

type SeriesPaths = {
  line: SkPath;
  fill: SkPath | null;
  dots: { x: number; y: number }[];
};

// Строит сглаженную кривую через точки серии по технике Catmull-Rom → Bezier:
// для внутреннего отрезка P1→P2 контрольные точки — P1+(P2-P0)/6 и
// P2-(P3-P1)/6; на краях соседняя точка, которой не хватает, дублируется
// (клэмп), чтобы кривая не "улетала" на первом/последнем сегменте.
// Skia не имеет встроенного построителя гладкого пути по произвольным точкам
// (в отличие от `addRRect`/`lineTo`), поэтому реализовано вручную.
function buildSmoothPath(points: { x: number; y: number }[]): SkPath {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;

  path.moveTo(points[0].x, points[0].y);
  if (points.length === 1) return path;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    path.cubicTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
  }

  return path;
}

function buildFillPath(
  points: { x: number; y: number }[],
  bottom: number
): SkPath {
  const fill = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  fill.lineTo(last.x, bottom);
  fill.lineTo(first.x, bottom);
  fill.close();
  return fill;
}

export default function BloodPressureLineChart({
  readings,
  height = 120,
}: Props) {
  const { theme } = useThemeContext();
  const [measured, setMeasured] = useState(0);

  const onLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const next = Math.ceil(nativeEvent.layout.width);
    if (next && next !== measured) setMeasured(next);
  };

  // Сортировка по времени создания записи: у `bloodPressureReadings` нет
  // поля `recordedAt` (см. convex/tables/bloodPressureReadings.ts) — тем же
  // полем `_creationTime` уже пользуется `ReadingRow` в HomeBloodPressureSummary.
  const sorted = useMemo(
    () => [...readings].sort((a, b) => a._creationTime - b._creationTime),
    [readings]
  );

  const chartWidth = Math.max(measured - Y_LABELS_WIDTH, 0);

  const layout = useMemo(() => {
    if (sorted.length < 2 || !chartWidth) return null;

    const allValues = sorted.flatMap((reading) => [
      reading.systolic,
      reading.diastolic,
    ]);
    const min = Math.min(...allValues) - VERTICAL_PADDING;
    const max = Math.max(...allValues) + VERTICAL_PADDING;
    const range = max - min || 1;

    const stepX = chartWidth / (sorted.length - 1);
    const toY = (value: number) => height - ((value - min) / range) * height;
    const toX = (i: number) => i * stepX;

    const systolicPoints = sorted.map((reading, i) => ({
      x: toX(i),
      y: toY(reading.systolic),
    }));
    const diastolicPoints = sorted.map((reading, i) => ({
      x: toX(i),
      y: toY(reading.diastolic),
    }));

    const systolic: SeriesPaths = {
      line: buildSmoothPath(systolicPoints),
      fill: buildFillPath(systolicPoints, height),
      dots: systolicPoints,
    };
    // Обе серии близки по значению (систолическое/диастолическое давление
    // обычно идут "парой"), поэтому вторая заливка поверх первой делает
    // график нечитаемым пятном — заполняем только систолическую (верхнюю)
    // линию, диастолическая остаётся линией с точками без заливки
    // (см. 07.1-07-CORRECTION-4-SUMMARY.md).
    const diastolic: SeriesPaths = {
      line: buildSmoothPath(diastolicPoints),
      fill: null,
      dots: diastolicPoints,
    };

    const yLabels = Array.from({ length: Y_LABEL_COUNT }, (_, i) => {
      const value = max - (range * i) / (Y_LABEL_COUNT - 1);
      return Math.round(value);
    });

    const xLabelStep = Math.max(
      Math.floor((sorted.length - 1) / (X_LABEL_COUNT - 1)),
      1
    );
    const xLabels = sorted
      .map((reading, i) => ({ reading, i }))
      .filter(
        ({ i }) => i % xLabelStep === 0 || i === sorted.length - 1
      )
      .map(({ reading, i }) => ({
        x: toX(i),
        label: format(reading._creationTime, "HH:mm"),
      }));

    return { systolic, diastolic, yLabels, xLabels };
  }, [sorted, chartWidth, height]);

  const gridColor = getColor("foreground", 0.08, theme);
  const labelColor = getColor("mutedForeground", undefined, theme);
  // Обводка точек — "вырез" под цвет фона карточки, а не литеральный
  // тёмный figma-хекс (#1A1F26): наш dark-фон карточки (#272C35, токен
  // `base`) отличается от figma-макета, поэтому getColor("base") даёт более
  // точный эффект "выреза" на обеих темах (см. SUMMARY).
  const dotBorderColor = getColor("base", undefined, theme);

  if (sorted.length < 2) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.row}>
        {measured > 0 && layout && (
          <View style={{ width: Y_LABELS_WIDTH, height }}>
            {layout.yLabels.map((value, i) => (
              <Text
                key={i}
                size="12"
                family="outfit"
                color={labelColor}
                style={[
                  styles.yLabel,
                  {
                    top:
                      (height * i) / (Y_LABEL_COUNT - 1) -
                      (i === 0 ? 0 : i === Y_LABEL_COUNT - 1 ? 14 : 7),
                  },
                ]}
              >
                {value}
              </Text>
            ))}
          </View>
        )}
        <Canvas style={{ width: chartWidth, height }}>
          {layout && (
            <>
              <Group>
                {Array.from({ length: VERTICAL_GUIDE_COUNT }, (_, i) => {
                  const x =
                    (chartWidth * (i + 1)) / (VERTICAL_GUIDE_COUNT + 1);
                  const guide = Skia.Path.Make();
                  guide.moveTo(x, 0);
                  guide.lineTo(x, height);
                  return (
                    <Path
                      key={`v-${i}`}
                      path={guide}
                      style="stroke"
                      strokeWidth={1}
                      color={gridColor}
                    >
                      <DashPathEffect intervals={[2, 2]} />
                    </Path>
                  );
                })}
                {layout.yLabels.map((_, i) => {
                  const y = (height * i) / (Y_LABEL_COUNT - 1);
                  const line = Skia.Path.Make();
                  line.moveTo(0, y);
                  line.lineTo(chartWidth, y);
                  return (
                    <Path
                      key={`h-${i}`}
                      path={line}
                      style="stroke"
                      strokeWidth={1}
                      color={gridColor}
                    >
                      <DashPathEffect intervals={[4, 4]} />
                    </Path>
                  );
                })}
              </Group>

              {layout.systolic.fill && (
                <Path path={layout.systolic.fill} style="fill">
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, height)}
                    colors={[`${SYSTOLIC_COLOR}4D`, `${SYSTOLIC_COLOR}00`]}
                  />
                </Path>
              )}

              <Path
                path={layout.diastolic.line}
                style="stroke"
                strokeWidth={STROKE_WIDTH}
                strokeCap="round"
                strokeJoin="round"
                color={DIASTOLIC_COLOR}
              />
              <Path
                path={layout.systolic.line}
                style="stroke"
                strokeWidth={STROKE_WIDTH}
                strokeCap="round"
                strokeJoin="round"
                color={SYSTOLIC_COLOR}
              />

              {layout.diastolic.dots.map((p, i) => (
                <Group key={`d-${i}`}>
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={DOT_RADIUS + DOT_BORDER_WIDTH}
                    color={dotBorderColor}
                  />
                  <Circle cx={p.x} cy={p.y} r={DOT_RADIUS} color={DIASTOLIC_COLOR} />
                </Group>
              ))}
              {layout.systolic.dots.map((p, i) => (
                <Group key={`s-${i}`}>
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={DOT_RADIUS + DOT_BORDER_WIDTH}
                    color={dotBorderColor}
                  />
                  <Circle cx={p.x} cy={p.y} r={DOT_RADIUS} color={SYSTOLIC_COLOR} />
                </Group>
              ))}
            </>
          )}
        </Canvas>
      </View>
      {measured > 0 && layout && (
        <View style={[styles.xLabels, { marginLeft: Y_LABELS_WIDTH }]}>
          {layout.xLabels.map(({ x, label }, i) => (
            <Text
              key={i}
              size="12"
              family="outfit"
              color={labelColor}
              style={[
                styles.xLabel,
                {
                  left: Math.min(
                    Math.max(x - 16, 0),
                    Math.max(chartWidth - 32, 0)
                  ),
                },
              ]}
            >
              {label}
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
  row: {
    flexDirection: "row",
  },
  yLabel: {
    position: "absolute",
    width: Y_LABELS_WIDTH - 8,
  },
  xLabels: {
    height: LABELS_HEIGHT,
    marginTop: 4,
  },
  xLabel: {
    position: "absolute",
    width: 32,
    textAlign: "center",
  },
});
