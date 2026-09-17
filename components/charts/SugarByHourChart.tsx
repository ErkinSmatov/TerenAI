import Text from "@/components/ui/Text";
import { Doc } from "@/convex/_generated/dataModel";
import { isGlucoseOutOfRange } from "@/convex/observers/utils/thresholds";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import {
  Canvas,
  Group,
  Path,
  Skia,
  type SkPath,
} from "@shopify/react-native-skia";
import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

const HOURS = 24;
const GAP = 4; // токен spacing xs
const BAR_RADIUS = 4;
const HOUR_LABEL_STEP = 4;

type HourBucket = {
  hour: number;
  average: number;
  outOfRange: boolean;
} | null;

type Props = {
  readings: Doc<"glucoseReadings">[];
  height?: number;
};

export default function SugarByHourChart({ readings, height = 120 }: Props) {
  const { theme } = useThemeContext();
  const [measured, setMeasured] = useState(0);

  const onLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const next = Math.ceil(nativeEvent.layout.width);
    if (next && next !== measured) setMeasured(next);
  };

  const buckets = useMemo<HourBucket[]>(() => {
    const groups: Doc<"glucoseReadings">[][] = Array.from(
      { length: HOURS },
      () => []
    );

    for (const reading of readings) {
      const hour = new Date(reading.recordedAt).getHours();
      groups[hour].push(reading);
    }

    return groups.map((group, hour) => {
      if (group.length === 0) return null;

      const average =
        group.reduce((sum, reading) => sum + reading.value, 0) / group.length;

      const outOfRange = group.some((reading) =>
        isGlucoseOutOfRange(reading.value, reading.unit, reading.context)
      );

      return { hour, average, outOfRange };
    });
  }, [readings]);

  const maxValue = useMemo(() => {
    const values = buckets
      .filter((bucket): bucket is NonNullable<HourBucket> => bucket !== null)
      .map((bucket) => bucket.average);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [buckets]);

  const barWidth =
    measured > 0 ? (measured - GAP * (HOURS - 1)) / HOURS : 0;

  const { trackPath, barPaths } = useMemo(() => {
    if (!measured || !barWidth) {
      return {
        trackPath: null,
        barPaths: [] as { path: SkPath; outOfRange: boolean }[],
      };
    }

    const track = Skia.Path.Make();
    const bars: { path: SkPath; outOfRange: boolean }[] = [];

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
        (bucket.average / maxValue) * height,
        BAR_RADIUS * 2
      );
      const y = height - barHeight;

      const barPath = Skia.Path.Make();
      barPath.addRRect({
        rect: { x, y, width: barWidth, height: barHeight },
        rx: BAR_RADIUS,
        ry: BAR_RADIUS,
      });
      bars.push({ path: barPath, outOfRange: bucket.outOfRange });
    }

    return { trackPath: track, barPaths: bars };
  }, [measured, barWidth, buckets, maxValue, height]);

  const trackColor = getColor("secondary", 0.08, theme);
  const inRangeColor = getColor("primary", undefined, theme);
  const outOfRangeColor = getColor("destructive", undefined, theme);
  const labelColor = getColor("mutedForeground", undefined, theme);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Canvas style={{ width: measured, height }}>
        <Group>
          {trackPath && <Path path={trackPath} style="fill" color={trackColor} />}
          {barPaths.map((bar, i) => (
            <Path
              key={i}
              path={bar.path}
              style="fill"
              color={bar.outOfRange ? outOfRangeColor : inRangeColor}
            />
          ))}
        </Group>
      </Canvas>
      {measured > 0 && (
        <View style={styles.labels}>
          {Array.from({ length: HOURS }, (_, hour) => hour)
            .filter((hour) => hour % HOUR_LABEL_STEP === 0)
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
                {hour}
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
  labels: {
    height: 16,
    marginTop: 4,
  },
});
