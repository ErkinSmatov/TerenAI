import { View } from "react-native";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react-native";
import Text from "../ui/Text";
import getColor from "@/lib/ui/getColor";
import getNutrientGlow from "@/lib/ui/getNutrientGlow";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

type Direction = "low" | "high";

type Props = {
  label: string;
  value: number | null;
  unit: string;
  direction: Direction;
};

// Литеральные фиксированные HEX из Figma (node 840:5482) для свечения
// тайлов Низкий/Высокий — та же осознанная конвенция "фиксированный
// декоративный figma-цвет, не через getColor()", что и у трёх нутриент-тайлов
// в HomeMicroSummary.tsx. Значения даны пользователем текстом напрямую.
const RANGE_GLOW = {
  low: { dark: "#869781", light: "rgba(134, 151, 129, 0.28)" },
  high: { dark: "#B84244", light: "rgba(184, 66, 68, 0.28)" },
} as const;

export default function HomeGlucoseRangeTile({
  label,
  value,
  unit,
  direction,
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const glow = RANGE_GLOW[direction];
  const glowStyle = getNutrientGlow(theme, glow.dark, glow.light);
  const Icon = direction === "low" ? ArrowDownRightIcon : ArrowUpRightIcon;

  return (
    <View style={[styles.card, glowStyle]}>
      <View style={styles.headerRow}>
        <Text
          size="12"
          weight="600"
          color={getColor("foreground", undefined, theme)}
        >
          {label}
        </Text>
        <Icon size={16} color={getColor("foreground", 0.6, theme)} />
      </View>
      <View style={styles.valueRow}>
        <Text size="20" weight="500" family="outfit">
          {value !== null ? Math.round(value) : "—"}
        </Text>
        {value !== null && (
          <Text
            size="12"
            family="outfit"
            color={getColor("foreground", 0.45, theme)}
            style={styles.unitText}
          >
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeName) => ({
  card: {
    flex: 1,
    backgroundColor:
      theme === "dark" ? "#15181F" : getColor("base", undefined, theme),
    borderRadius: 24,
    padding: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
  },
  valueRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: 4,
  },
  unitText: {
    paddingBottom: 2,
  },
});
