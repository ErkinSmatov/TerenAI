import { View } from "react-native";
import getColor from "@/lib/ui/getColor";
import getNutrientGlow from "@/lib/ui/getNutrientGlow";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import Button from "../ui/Button";
import Text from "../ui/Text";

type Size = "sm" | "lg";

type Props = {
  name: string;
  value: number;
  target: number;
  size?: Size;
  /**
   * Literal fixed HEX used for the dark-theme INSET glow (Figma node
   * 813:918 — a flat `#15181F` tile with `box-shadow: inset 0 0 40px 0
   * <tint>`). NOT run through `getColor()` for the 3 micronutrient
   * tiles — see `HomeMicroSummary.tsx`. The "Качество" tile is the one
   * exception that does derive this from `getColor("health", ...)`,
   * per user decision.
   */
  darkGlowColor: string;
  /**
   * Light-theme equivalent — a soft AMBIENT (non-inset) colored glow at
   * low opacity, since there is no Figma light-theme reference for
   * these tiles. See 07.1-07-CORRECTION-3-SUMMARY.md for chosen values.
   */
  lightGlowColor: string;
  onPress?: () => void;
};

export default function HomeNutrientGlowCard({
  name,
  value,
  target,
  size = "sm",
  darkGlowColor,
  lightGlowColor,
  onPress,
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const glowStyle = getNutrientGlow(theme, darkGlowColor, lightGlowColor);

  return (
    <Button
      variant="base"
      size="base"
      onPress={onPress}
      style={size === "sm" ? styles.buttonSm : undefined}
    >
      <View style={[styles.card, glowStyle]}>
        <Text
          size="12"
          weight="600"
          color={getColor("foreground", undefined, theme)}
        >
          {name}
        </Text>
        <View style={styles.valueRow}>
          <Text
            size={size === "lg" ? "48" : "20"}
            weight="600"
            family="outfit"
          >
            {Math.round(value)}
          </Text>
          <Text
            size={size === "lg" ? "20" : "12"}
            family="outfit"
            color={getColor("foreground", 0.45, theme)}
            style={styles.targetText}
          >
            /{target}
          </Text>
        </View>
      </View>
    </Button>
  );
}

const createStyles = (theme: ThemeName) => ({
  buttonSm: {
    flex: 1,
  },
  // Плоский фон без бордера — точное соответствие Figma-узлу 813:918
  // (никакого hairline-бордера/внешней тени в референсе, только заливка +
  // inset-свечение). Тёмный фон — литеральный `#15181F` из Figma (по
  // значению совпадает с текущим токеном `muted` тёмной темы, но задан как
  // фиксированное значение узла, а не через `getColor`, т.к. это Figma-пиксель,
  // а не смысловой токен). Светлый фон — токен `base` (по прямому указанию
  // пользователя, п.1 user_decisions).
  card: {
    backgroundColor: theme === "dark" ? "#15181F" : getColor("base", undefined, theme),
    borderRadius: 24,
    padding: 14,
    gap: 12,
  },
  valueRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
  },
  targetText: {
    paddingBottom: 2,
  },
});
