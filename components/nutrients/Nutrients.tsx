import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
  ScreenMainTitle,
} from "@/components/ui/screen/ScreenMain";
import Text from "@/components/ui/Text";
import { NutrientMetric, nutrientsData } from "@/config/nutrientsConfig";
import { NutrientsType } from "@/convex/tables/mealItems";
import useProgress from "@/lib/hooks/reanimated/useProgress";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import getColor from "@/lib/ui/getColor";
import { View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

const unitScaleMap: Record<string, number> = {
  g: 1,
  mg: 1000,
  µg: 1000000,
  ml: 1,
  IU: 1,
};

type MetricProps = {
  metric: NutrientMetric;
  value: number;
  themeColor: string;
  progress: SharedValue<number>;
};

function Metric({ metric, value, themeColor, progress }: MetricProps) {
  const styles = useThemedStyles(createStyles);
  const scaledValue = value * unitScaleMap[metric.unit];
  const valuePercent = (scaledValue / metric.max) * 100;
  const targetPercent = [
    (metric.target[0] / metric.max) * 100,
    (metric.target[1] / metric.max) * 100,
  ];

  const animatedStyles = {
    progressBar: useAnimatedStyle(() => ({
      width: `${valuePercent * progress.value}%`,
    })),
  };

  const roundedValue =
    metric.max > 20
      ? Math.round(scaledValue)
      : Math.round(scaledValue * 10) / 10;

  return (
    <View style={styles.metric}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text size="14" weight="500">
          {metric.label}
        </Text>
        <Text size="14">
          {roundedValue} {metric.unit}
        </Text>
      </View>
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.overlayBar,
            {
              backgroundColor: themeColor,
              left: `${targetPercent[0]}%`,
              right: `${100 - targetPercent[1]}%`,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: themeColor,
              width: `${valuePercent}%`,
            },
            animatedStyles.progressBar,
          ]}
        />
      </View>
    </View>
  );
}

type Props = {
  nutrients?: NutrientsType;
  title: string;
};

export default function Nutrients({ nutrients, title }: Props) {
  const styles = useThemedStyles(createStyles);
  const { scrollY, onScroll } = useScrollY();
  const progress = useProgress();

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Микронутриенты" />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll, contentContainerStyle: { flexGrow: 1 } }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <ScreenMainTitle title={title} />
        <View style={styles.container}>
          {nutrientsData.map((section) => (
            <View
              key={`micro-${section.id}-${section.categoryLabel}`}
              style={styles.section}
            >
              <Text size="18" weight="600">
                {section.categoryLabel}
              </Text>
              <View style={styles.metricsContainer}>
                {section.metrics.map((metric) => {
                  const value =
                    (
                      nutrients?.[section.id] as
                        | Record<string, number | undefined>
                        | undefined
                    )?.[metric.id] ?? 0;

                  return (
                    <Metric
                      key={`summary-metric-${metric.label}`}
                      metric={metric}
                      value={value}
                      themeColor={section.themeColor}
                      progress={progress}
                    />
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const createStyles = (theme: ThemeName) => ({
  container: {
    gap: 24,
  },
  section: {
    gap: 8,
  },
  metricsContainer: {
    gap: 12,
  },
  metric: {
    gap: 4,
  },
  // "muted", не "secondary": в тёмной палитре secondary — сплошной белый,
  // задуман только для использования с низкой прозрачностью (см.
  // lib/ui/palettes.ts) — как сплошной фон давал бледный трек в тёмной теме.
  progressContainer: {
    height: 16,
    justifyContent: "center" as const,
    borderRadius: 999,
    overflow: "hidden" as const,
    backgroundColor: getColor("muted", undefined, theme),
  },
  overlayBar: {
    height: "100%" as const,
    opacity: 0.3,
    width: "35%" as const,
    right: 0,
    position: "absolute" as const,
  },
  progressBar: {
    height: 6,
    width: "75%" as const,
    position: "absolute" as const,
    borderRadius: 999,
  },
});
