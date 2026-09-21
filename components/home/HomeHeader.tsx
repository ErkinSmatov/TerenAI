import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import Text from "../ui/Text";
import { FlameIcon, UsersIcon } from "lucide-react-native";
import Pill from "../ui/Pill";
import Button from "../ui/Button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SafeArea from "../ui/SafeArea";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

export default function HomeHeader() {
  const router = useRouter();
  const { theme, isDark } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const streak = useQuery(api.home.getStreak.default, {
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
  });

  return (
    <SafeArea edges={["left", "right"]} style={styles.safeArea}>
      {/* Полупрозрачный размытый фон-подложка — та же техника, что и у нижнего
          таб-бара (BlurView из expo-blur), но заметно темнее/плотнее по
          прямому запросу пользователя (D-03): intensity выше (45 против 30)
          плюс дополнительный тёмный scrim поверх самого blur. */}
      <BlurView
        intensity={45}
        tint={isDark ? "dark" : "light"}
        style={styles.headerBackground}
      />
      <View
        style={[styles.headerBackground, styles.headerScrim]}
        pointerEvents="none"
      />
      <View style={styles.logoContainer}>
        <Text size="28" weight="600">
          TerenAI
        </Text>
      </View>
      <View style={styles.iconGroup}>
        <Button
          variant="base"
          size="base"
          accessibilityLabel="Открыть серию и календарь"
          onPress={() => {
            router.push("/app/(home)/streak");
          }}
        >
          <Pill style={styles.streakContainer}>
            <FlameIcon
              size={20}
              color={getColor("orange")}
              fill={getColor("orange")}
            />
            <Text family="outfit" weight="600">
              {streak ?? 0}
            </Text>
          </Pill>
        </Button>
        <Button
          variant="base"
          size="base"
          accessibilityLabel="Кого я наблюдаю"
          onPress={() => {
            router.push("/app/(settings)/observedList");
          }}
        >
          {/* Слот теперь занят кнопкой наблюдаемых, имя стиля сохранено как есть */}
          <Pill style={styles.calendarContainer}>
            <UsersIcon size={20} color={getColor("foreground", undefined, theme)} />
          </Pill>
        </Button>
      </View>
    </SafeArea>
  );
}

const createStyles = (theme: ThemeName) => ({
  safeArea: {
    flex: 0,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 16,
    backgroundColor: "transparent",
    borderRadius: 24,
    overflow: "hidden" as const,
    paddingVertical: 8,
  },
  // Фон-подложка хедера: BlurView + тёмный scrim поверх него (см. JSX) —
  // та же техника, что и у нижнего таб-бара (`app/(tabs)/_layout.tsx`), но
  // заметно темнее/плотнее по прямому запросу пользователя (D-03).
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  headerScrim: {
    backgroundColor: getColor("background", 0.15, theme),
  },
  logoContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  iconGroup: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  calendarContainer: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  streakContainer: {
    minWidth: 56,
  },
});
