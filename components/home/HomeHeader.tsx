import { StyleSheet, View } from "react-native";
import TerenAILogo from "@/assets/svg/terenai-logo.svg";
import getColor from "@/lib/ui/getColor";
import Text from "../ui/Text";
import { FlameIcon, UsersIcon } from "lucide-react-native";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SafeArea from "../ui/SafeArea";
import { useRouter } from "expo-router";

export default function HomeHeader() {
  const router = useRouter();
  const streak = useQuery(api.home.getStreak.default, {
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
  });

  return (
    <SafeArea edges={["left", "right"]} style={styles.safeArea}>
      <View style={styles.logoContainer}>
        <TerenAILogo width={28} height={28} color={getColor("foreground")} />
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
          <Card style={styles.streakContainer}>
            <FlameIcon
              size={20}
              color={getColor("orange")}
              fill={getColor("orange")}
            />
            <Text weight="600">{streak ?? 0}</Text>
          </Card>
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
          <Card style={styles.calendarContainer}>
            <UsersIcon size={20} color={getColor("foreground")} />
          </Card>
        </Button>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calendarContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: getColor("background"),
    borderRadius: 999,
    height: 44,
    width: 44,
    padding: 0,
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: getColor("background"),
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
    borderRadius: 999,
    minWidth: 56,
  },
});
