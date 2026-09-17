import { BlurView } from "expo-blur";
import { StyleSheet, View, ViewProps } from "react-native";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

type Props = {
  children: React.ReactNode;
} & ViewProps;

// Фабрика на уровне модуля — стабильная ссылка для кэша useThemedStyles.
const createStyles = (theme: ThemeName) => ({
  pill: {
    borderRadius: 999,
    overflow: "hidden" as const,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: getColor("secondary", 0.08, theme),
    backgroundColor:
      theme === "dark"
        ? getColor("base", 0.06, theme)
        : getColor("foreground", 0.04, theme),
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
});

// Примитив чисто презентационный: никакой навигации, обработчиков нажатия
// и запросов данных внутри — вызывающая сторона при необходимости
// оборачивает его в `Button variant="base"`.
export default function Pill({ children, style, ...props }: Props) {
  const styles = useThemedStyles(createStyles);
  const { isDark } = useThemeContext();

  return (
    <View style={[styles.pill, style]} {...props}>
      <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}
