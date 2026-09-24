import { LayoutChangeEvent, View } from "react-native";
import Button from "./Button";
import getColor from "@/lib/ui/getColor";
import Text from "./Text";
import { useEffect, useRef, useState } from "react";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

type Props = {
  options: string[];
  selectedOption: string;
  onChange: (option: string) => void;
};

export default function SegmentedControl({
  options,
  selectedOption,
  onChange,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const [optionsWidths, setOptionsWidths] = useState<number[]>(
    options.map(() => 0)
  );

  const indicatorInitializedRef = useRef(false);

  const indicatorLeft = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const selectedIndex = options.indexOf(selectedOption);
  const selectedIndexSV = useSharedValue(selectedIndex);

  useEffect(() => {
    if (selectedIndex < 0) return;
    selectedIndexSV.value = selectedIndex;

    const allMeasured =
      optionsWidths.length === options.length &&
      optionsWidths.every((w) => w > 0);
    if (!allMeasured) return;

    const width = optionsWidths.at(selectedIndex) ?? 0;
    const left = optionsWidths
      .slice(0, Math.max(0, selectedIndex))
      .reduce((acc, w) => acc + w, 0);

    const springConfig = { stiffness: 500, damping: 30, mass: 0.9 } as const;
    if (!indicatorInitializedRef.current) {
      indicatorInitializedRef.current = true;
      indicatorWidth.value = width;
      indicatorLeft.value = left;
    } else {
      indicatorWidth.value = withSpring(width, springConfig);
      indicatorLeft.value = withSpring(left, springConfig);
    }
  }, [
    selectedIndex,
    optionsWidths,
    indicatorLeft,
    indicatorWidth,
    options.length,
    selectedIndexSV,
  ]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    left: indicatorLeft.value,
  }));

  const onOptionLayout = (event: LayoutChangeEvent, index: number) => {
    const { width } = event.nativeEvent.layout;
    setOptionsWidths((prev) => {
      const newLayouts = [...prev];
      newLayouts[index] = width;
      return newLayouts;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonsContainer}>
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, indicatorStyle]}
        />
        {options.map((option, index) => (
          <Button
            key={`option-${option}-${index}`}
            size="sm"
            variant="ghost"
            onLayout={(event) => {
              onOptionLayout(event, index);
            }}
            onPress={() => {
              onChange(option);
            }}
          >
            <OptionLabel
              label={option}
              index={index}
              selectedIndexSV={selectedIndexSV}
            />
          </Button>
        ))}
      </View>
    </View>
  );
}

const AnimatedText = Animated.createAnimatedComponent(Text);

type OptionLabelProps = {
  label: string;
  index: number;
  selectedIndexSV: SharedValue<number>;
};

function OptionLabel({ label, index, selectedIndexSV }: OptionLabelProps) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const progress = useDerivedValue(() =>
    withTiming(selectedIndexSV.value === index ? 1 : 0, { duration: 180 })
  );

  // interpolateColor выполняется в worklet-контексте useAnimatedStyle —
  // тема должна передаваться явно третьим аргументом getColor, иначе
  // worklet замкнёт значение activePalette на момент сериализации и не
  // увидит последующую смену темы (см. комментарий в lib/ui/getColor.ts).
  const animatedTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progress.value,
      [0, 1],
      [getColor("foreground", undefined, theme), getColor("background", undefined, theme)]
    );
    return { color };
  });

  return (
    <AnimatedText size="14" style={[styles.optionText, animatedTextStyle]}>
      {label}
    </AnimatedText>
  );
}

const createStyles = (theme: ThemeName) => ({
  container: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  buttonsContainer: {
    flexDirection: "row" as const,
    height: 40,
    backgroundColor: getColor("secondary", undefined, theme),
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 999,
  },
  indicator: {
    height: 40,
    position: "absolute" as const,
    backgroundColor: getColor("foreground", undefined, theme),
    borderRadius: 999,
  },
  optionText: {
    fontWeight: 600 as const,
  },
});
