import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import getShadow from "@/lib/ui/getShadow";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { StyleSheet, View, ViewProps, ViewStyle } from "react-native";

type Glow = "success" | "destructive";

type Props = {
  children: React.ReactNode;
  glow?: Glow;
} & ViewProps;

// Мягкое цветное свечение по краю карточки (не заливка фона) — та же
// объектная форма `boxShadow`, что и `getShadow`, но с фиксированным
// цветом статуса вместо чёрного.
function getGlowShadow(glow: Glow, theme: ThemeName): Pick<ViewStyle, "boxShadow"> {
  const glowColor =
    glow === "success"
      ? getColor("health", 0.35, theme)
      : getColor("destructive", 0.35, theme);

  return {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 16,
        spreadDistance: 0,
        color: glowColor,
      },
    ],
  };
}

// Фабрика объявлена на уровне модуля — стабильная ссылка, требуемая
// кэшем `useThemedStyles`.
const createStyles = (theme: ThemeName) => ({
  card: {
    backgroundColor: getColor("base", undefined, theme),
    borderRadius: 24,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: getColor(
      "secondary",
      theme === "dark" ? 0.08 : undefined,
      theme
    ),
    ...getShadow("sm"),
  },
});

export default function Card({ children, glow, style, ...props }: Props) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useThemeContext();
  const glowStyle = glow ? getGlowShadow(glow, theme) : undefined;

  return (
    <View style={[styles.card, glowStyle, style]} {...props}>
      {children}
    </View>
  );
}
