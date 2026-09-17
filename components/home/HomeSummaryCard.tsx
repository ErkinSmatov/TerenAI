import calcRatio from "@/lib/utils/calcRatio";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import {
  SharedValue,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { View } from "react-native";
import getColor from "@/lib/ui/getColor";
import Text from "../ui/Text";
import CircularProgress from "../ui/CircularProgress";
import { ComponentType, useEffect } from "react";
import { LucideProps } from "lucide-react-native";

type Props = {
  item: {
    name: string;
    value: number;
    target: number;
    Icon: ComponentType<LucideProps>;
    color: string;
  };
  progress: SharedValue<number>;
};

export default function HomeSummaryCard({ item, progress }: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const ratio = calcRatio(item.value, item.target);
  const animatedRatio = useSharedValue(ratio);

  // Свечение статуса карточки: за целевым диапазоном — destructive,
  // в целевом коридоре (>=80%) — success. Фон карточки не перекрашивается.
  const glow = ratio > 1 ? "destructive" : ratio >= 0.8 ? "success" : undefined;
  // Заливка «в норме» использует акцентный цвет активной темы (разрешённое
  // применение акцента по UI-SPEC), над целью — destructive.
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
    <Button variant="base" size="base" style={{ flex: 1 }}>
      <Card style={styles.card} glow={glow}>
        <Text
          size="12"
          weight="600"
          color={getColor("mutedForeground", undefined, theme)}
        >
          {item.name}
        </Text>
        <View style={styles.cardValueContainer}>
          <Text size="18" weight="600" family="outfit">
            {Math.round(item.value)}
          </Text>
          <Text
            size="10"
            family="outfit"
            color={getColor("mutedForeground", undefined, theme)}
            style={styles.cardTargetText}
          >
            {" "}
            / {item.target}
          </Text>
        </View>
        <View style={styles.cardProgressContainer}>
          <CircularProgress
            progress={itemProgress}
            color={ringColor}
            strokeWidth={4}
            size={80}
          />
          <View style={styles.cardIconContainer}>
            <item.Icon size={18} strokeWidth={2.25} />
          </View>
        </View>
      </Card>
    </Button>
  );
}

const createStyles = (theme: ThemeName) => ({
  card: {
    backgroundColor: getColor("background", undefined, theme),
    flex: 1,
    padding: 16,
  },
  cardValueContainer: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    paddingBottom: 12,
    paddingTop: 4,
  },
  cardTargetText: {
    paddingBottom: 3,
  },
  cardProgressContainer: {
    height: 80,
    width: 80,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    alignSelf: "center" as const,
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
