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
import { View } from "react-native";

export default function HomeHeader() {
  const router = useRouter();
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const streak = useQuery(api.home.getStreak.default, {
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
  });
  const userName = useQuery(api.home.getCurrentUserName.default);

  return (
    <SafeArea edges={["left", "right"]} style={styles.safeArea}>
      <View style={styles.logoContainer}>
        <Text size="20" weight="600">
          {userName ? `${userName}, привет!` : "Привет!"}
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

const createStyles = (_theme: ThemeName) => ({
  safeArea: {
    flex: 0,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 16,
    backgroundColor: "transparent",
    paddingVertical: 8,
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
