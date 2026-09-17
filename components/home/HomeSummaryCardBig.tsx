import { View } from "react-native";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Text from "../ui/Text";
import CircularProgress from "../ui/CircularProgress";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { ComponentType, useEffect } from "react";
import { LucideProps } from "lucide-react-native";
import {
  SharedValue,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import calcRatio from "@/lib/utils/calcRatio";

type Props = {
  item: {
    name: string;
    value: number;
    target: number;
    Icon: ComponentType<LucideProps>;
    color: string;
  };
  progress: SharedValue<number>;
  onPress?: () => void;
};

export default function HomeSummaryCardBig({ item, progress, onPress }: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const ratio = calcRatio(item.value, item.target);
  const animatedRatio = useSharedValue(ratio);

  const glow = ratio > 1 ? "destructive" : ratio >= 0.8 ? "success" : undefined;
  const ringColor =
    ratio > 1
      ? getColor("destructive", undefined, theme)
      : getColor("primary", undefined, theme);

  useEffect(() => {
    animatedRatio.value = withTiming(ratio, { duration: 750 });
  }, [ratio, animatedRatio]);

  const itemProgress = useDerivedValue(
    () => animatedRatio.value * progress.value
  );

  return (
    <Button variant="base" size="base" onPress={onPress}>
      <Card style={styles.card} glow={glow}>
        <View style={styles.cardTextContainer}>
          <Text
            size="12"
            weight="600"
            color={getColor("mutedForeground", undefined, theme)}
          >
            {item.name}
          </Text>
          <View style={styles.cardValueContainer}>
            <Text size="48" weight="600" family="outfit">
              {Math.round(item.value)}
            </Text>
            <Text
              size="20"
              family="outfit"
              color={getColor("mutedForeground", undefined, theme)}
              style={styles.cardTargetText}
            >
              {" "}
              / {item.target}
            </Text>
          </View>
        </View>
        <View style={styles.cardProgressContainer}>
          <CircularProgress
            progress={itemProgress}
            color={ringColor}
            strokeWidth={5}
            size={80}
          />
          <View style={styles.cardIconContainer}>
            <item.Icon size={20} strokeWidth={2.25} color={item.color} />
          </View>
        </View>
      </Card>
    </Button>
  );
}

const createStyles = (theme: ThemeName) => ({
  card: {
    backgroundColor: getColor("background", undefined, theme),
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  cardTextContainer: {},
  cardValueContainer: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
  },
  cardTargetText: {
    paddingBottom: 6,
  },
  cardProgressContainer: {
    height: 80,
    width: 80,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardIconContainer: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: getColor("muted", undefined, theme),
  },
});
