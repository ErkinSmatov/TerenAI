import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
  ScreenMainTitle,
} from "@/components/ui/screen/ScreenMain";
import Text from "@/components/ui/Text";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { ActivityIcon, HeartPulseIcon } from "lucide-react-native";
import { StyleSheet, View, Platform } from "react-native";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import getColor from "@/lib/ui/getColor";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import {
  connectHealthKit,
  fetchRecentGlucoseSamples,
  fetchRecentMovement,
  isHealthKitConnected,
} from "@/lib/health/healthKit";

export default function HealthScreen() {
  const { scrollY, onScroll } = useScrollY();
  const profile = useQuery(api.profiles.getProfile.default);
  const isGlucometerTrack = profile?.data?.goalTrack === "glucometer";

  const syncMovementDays = useMutation(api.movement.syncDays.default);
  const importGlucoseReadings = useMutation(
    api.glucose.importHealthKitReadings.default
  );

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    void isHealthKitConnected().then(setIsConnected);
  }, []);

  const handleConnect = async () => {
    setIsSyncing(true);
    try {
      const granted = await connectHealthKit(isGlucometerTrack);
      if (!granted) {
        Toast.show({
          text: "Не удалось получить доступ к Apple Health.",
          variant: "error",
        });
        return;
      }

      setIsConnected(true);

      const days = await fetchRecentMovement(8);
      if (days.length > 0) {
        await syncMovementDays({ days });
      }

      if (isGlucometerTrack) {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const readings = await fetchRecentGlucoseSamples(since);
        if (readings.length > 0) {
          await importGlucoseReadings({ readings });
        }
      }

      Toast.show({ text: "Apple Health подключён." });
    } finally {
      setIsSyncing(false);
    }
  };

  if (Platform.OS !== "ios") {
    return (
      <ScreenMain edges={[]}>
        <ScreenHeader>
          <ScreenHeaderBackButton />
          <ScreenHeaderTitle title="Здоровье" />
        </ScreenHeader>
        <ScreenMainScrollView
          safeAreaProps={{ edges: ["left", "right", "bottom"] }}
        >
          <Text size="14" color={getColor("mutedForeground")}>
            Интеграция со здоровьем пока доступна только на iOS.
          </Text>
        </ScreenMainScrollView>
      </ScreenMain>
    );
  }

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Здоровье" />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <ScreenMainTitle
          title="Apple Health"
          description={
            isGlucometerTrack
              ? "Подключите Apple Health, чтобы TerenAI забирал шаги, активность и данные о глюкозе."
              : "Подключите Apple Health, чтобы TerenAI забирал шаги и активность."
          }
        />

        <Card style={styles.card}>
          <View style={styles.row}>
            <ActivityIcon size={20} color={getColor("foreground")} />
            <Text size="14">Шаги, калории, дистанция</Text>
          </View>
          {isGlucometerTrack && (
            <View style={styles.row}>
              <HeartPulseIcon size={20} color={getColor("foreground")} />
              <Text size="14">Глюкоза (если есть в Apple Health)</Text>
            </View>
          )}
        </Card>

        <Button
          variant="primary"
          size="base"
          onPress={() => void handleConnect()}
          disabled={isSyncing}
          style={styles.button}
        >
          {isConnected
            ? isSyncing
              ? "Синхронизация..."
              : "Обновить данные"
            : isSyncing
              ? "Подключение..."
              : "Подключить Apple Health"}
        </Button>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  button: {
    marginTop: 16,
  },
});
