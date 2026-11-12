import Slider from "@/components/ui/Slider";
import Text from "@/components/ui/Text";
import {
  OnboardingData,
  useOnboardingContext,
} from "@/context/OnboardingContext";
import kgToLbs from "@/lib/units/kgToLbs";
import lbsToKg from "@/lib/units/lbsToKg";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { useThemeContext } from "@/context/ThemeContext";
import { View } from "react-native";
import AnimateableText from "react-native-animateable-text";
import {
  SharedValue,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import OnboardingStep from "../../OnboardingStep";
import resolveFontFamily from "@/lib/ui/resolveFontFamily";

const minKg = 0.1;
const minLbs = 0.2;
const maxKg = 1.5;
const maxLbs = 3.3;
const defaultKg = 0.5;
const defaultLbs = 1.0;
const recommendedKg = [0.25, 0.85] as [number, number];
const recommendedLbs = [0.65, 1.75] as [number, number];

export default function OnboardingWeightChangeRate() {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const { data, setData } = useOnboardingContext();

  const isMetric = data.measurementSystem !== "imperial";

  const displayBounds = isMetric
    ? { min: minKg, max: maxKg, def: defaultKg, rec: recommendedKg }
    : { min: minLbs, max: maxLbs, def: defaultLbs, rec: recommendedLbs };

  const initialDisplayValue = isMetric
    ? data.weightChangeRate
    : kgToLbs(data.weightChangeRate * 10) / 10;

  const changeRate = useSharedValue(initialDisplayValue);

  const weeklyRate = useDerivedValue(() => {
    return Math.round(changeRate.value * 10) / 10;
  });
  const monthlyRate = useDerivedValue(() => {
    return (Math.round(changeRate.value * 10) / 10) * 4;
  });

  const changeSign = data.goal === "lose" ? "-" : "+";
  const unitLabel = isMetric ? "kg" : "lbs";

  const getMessage = (rate: number, rec: [number, number], def: number) => {
    "worklet";
    const roundedRate = Math.round(rate * 10) / 10;
    if (rate < rec[0]) {
      return "Медленно";
    } else if (rate > rec[1]) {
      return "Быстро (будьте осторожны)";
    } else if (roundedRate === def) {
      return "Стандартно (рекомендуется)";
    } else {
      return "Стандартно";
    }
  };

  const animatedProps = {
    tooltip: useAnimatedProps(() => ({
      text: getMessage(changeRate.value, displayBounds.rec, displayBounds.def),
    })),
  };

  const handleSlidingComplete = (value: number) => {
    const roundedValue = Math.round(value * 10) / 10;
    syncWeightChangeRate(roundedValue, isMetric, setData);
  };

  return (
    <OnboardingStep title="Как быстро вы хотите достичь цели?">
      <View style={styles.container}>
        <View style={styles.tooltipContainer}>
          <AnimateableText
            animatedProps={animatedProps.tooltip}
            style={[
              styles.tooltip,
              // "muted", не "secondary": в тёмной палитре secondary — сплошной
              // белый, задуман только для низкой прозрачности (palettes.ts).
              // Зелёный primaryLight прятал белый текст в тёмной теме.
              { backgroundColor: getColor("muted", undefined, theme) },
            ]}
          />
        </View>
        <Slider
          minValue={displayBounds.min}
          maxValue={displayBounds.max}
          value={changeRate}
          initialValue={initialDisplayValue}
          highlightedRange={displayBounds.rec}
          onSlidingComplete={handleSlidingComplete}
        />
        <View style={styles.weightChange}>
          {[
            { amount: weeklyRate, period: "В неделю" },
            { amount: monthlyRate, period: "В месяц" },
          ].map(({ amount, period }) => (
            <WeightChangeRow
              key={`row-${period}`}
              sign={changeSign}
              amount={amount}
              period={period}
              unit={unitLabel}
            />
          ))}
        </View>
      </View>
    </OnboardingStep>
  );
}

function syncWeightChangeRate(
  roundedDisplayValue: number,
  isMetric: boolean,
  setData: (updater: (prev: OnboardingData) => OnboardingData) => void
) {
  const valueKg = isMetric
    ? roundedDisplayValue
    : Math.round(lbsToKg(roundedDisplayValue) * 10) / 10;
  setData((prev) => ({
    ...prev,
    weightChangeRate: valueKg,
  }));
}

type WeightChangeRowProps = {
  sign: string;
  amount: SharedValue<number>;
  period: string;
  unit: string;
};

function WeightChangeRow({ sign, amount, period, unit }: WeightChangeRowProps) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const animatedProps = {
    amount: useAnimatedProps(() => ({
      text: String(amount.value),
    })),
  };

  return (
    <View style={styles.row}>
      <Text size="24" weight="300">
        {sign}
      </Text>
      <View style={styles.valueContainer}>
        <AnimateableText
          animatedProps={animatedProps.amount}
          style={styles.valueNumber}
        />
        <Text size="16" weight="500" color={getColor("mutedForeground", 0.5, theme)}>
          {unit}
        </Text>
      </View>
      <Text size="16" style={styles.periodLabel}>
        {period}
      </Text>
    </View>
  );
}

const createStyles = (theme: ThemeName) => ({
  container: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tooltipContainer: {
    position: "absolute" as const,
    bottom: "50%" as const,
    transform: [{ translateY: -36 }],
  },
  tooltip: {
    fontSize: 16,
    fontFamily: resolveFontFamily({ weight: 600 }),
    color: getColor("foreground", undefined, theme),
    includeFontPadding: false,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  weightChange: {
    position: "absolute" as const,
    gap: 8,
    top: "50%" as const,
    transform: [{ translateY: 36 }],
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  valueContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    width: 86,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: getColor("mutedForeground", 0.5, theme),
  },
  valueNumber: {
    fontSize: 16,
    fontFamily: resolveFontFamily({ weight: 600 }),
    color: getColor("foreground", undefined, theme),
    includeFontPadding: false,
  },
  periodLabel: {
    paddingLeft: 8,
  },
});
