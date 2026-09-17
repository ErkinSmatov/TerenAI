import { Doc } from "@/convex/_generated/dataModel";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import { Canvas, Path, Skia, type SkPath } from "@shopify/react-native-skia";
import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

const VERTICAL_PADDING = 10;
const STROKE_WIDTH = 2;

type Props = {
  readings: Doc<"bloodPressureReadings">[];
  height?: number;
};

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

  const paths = useMemo<{
    systolic: SkPath;
    diastolic: SkPath;
  } | null>(() => {
    if (sorted.length < 2 || !measured) return null;

    const allValues = sorted.flatMap((reading) => [
      reading.systolic,
      reading.diastolic,
    ]);
    const min = Math.min(...allValues) - VERTICAL_PADDING;
    const max = Math.max(...allValues) + VERTICAL_PADDING;
    const range = max - min || 1;

    const stepX = measured / (sorted.length - 1);

    const toY = (value: number) => height - ((value - min) / range) * height;

    const systolicPath = Skia.Path.Make();
    const diastolicPath = Skia.Path.Make();

    sorted.forEach((reading, i) => {
      const x = i * stepX;
      const systolicY = toY(reading.systolic);
      const diastolicY = toY(reading.diastolic);

      if (i === 0) {
        systolicPath.moveTo(x, systolicY);
        diastolicPath.moveTo(x, diastolicY);
      } else {
        systolicPath.lineTo(x, systolicY);
        diastolicPath.lineTo(x, diastolicY);
      }
    });

    return { systolic: systolicPath, diastolic: diastolicPath };
  }, [sorted, measured, height]);

  const systolicColor = getColor("destructive", undefined, theme);
  const diastolicColor = getColor("primary", undefined, theme);

  if (sorted.length < 2) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Canvas style={{ width: measured, height }}>
        {paths && (
          <>
            <Path
              path={paths.systolic}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              color={systolicColor}
            />
            <Path
              path={paths.diastolic}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              color={diastolicColor}
            />
          </>
        )}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
