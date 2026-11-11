import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";
import { Toast } from "@/components/ui/Toast";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import type { ThemeName } from "@/lib/ui/palettes";
import logError from "@/lib/utils/logError";
import { hasHealthBlocks } from "@/lib/profile/hasHealthBlocks";
import useHealthSyncRunner from "@/lib/hooks/useHealthSyncRunner";
import {
  hasSeenHealthPrompt,
  markHealthPromptSeen,
} from "@/lib/health/healthSyncState";
import {
  connectHealth,
  getHealthAvailability,
  healthPlatformName,
  isHealthConnected,
  isHealthPlatformSupported,
  openHealthProviderInstall,
} from "@/lib/health/healthProvider";
import type { HealthAvailability } from "@/lib/health/healthTypes";

// Одноразовое предложение подключить здоровье после онбординга.
// Рендерится в layout авторизованной зоны, онбординг не затрагивается.
export default function HealthAccessPrompt() {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const profile = useQuery(api.profiles.getProfile.default);
  const includeGlucose = hasHealthBlocks(profile?.data?.goalTrack);
  const runner = useHealthSyncRunner(includeGlucose);
  const sheetRef = useRef<BottomSheetModal>(null);
  const decidedRef = useRef(false);
  const [availability, setAvailability] = useState<HealthAvailability | null>(
    null,
  );
  const [isConnecting, setIsConnecting] = useState(false);

  const isProfileLoaded = profile !== undefined;

  useEffect(() => {
    if (!isProfileLoaded || decidedRef.current) return;
    decidedRef.current = true;
    if (!isHealthPlatformSupported || hasSeenHealthPrompt()) return;

    const state = { cancelled: false };
    const isCancelled = () => state.cancelled;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      try {
        const nextAvailability = await getHealthAvailability();
        if (isCancelled() || nextAvailability === "unsupported") return;
        if (await isHealthConnected()) {
          markHealthPromptSeen();
          return;
        }
        if (isCancelled()) return;
        setAvailability(nextAvailability);
        // Не накладываемся на системный запрос пушей при входе
        timer = setTimeout(() => {
          if (AppState.currentState !== "active") return;
          markHealthPromptSeen();
          sheetRef.current?.present();
        }, 1500);
      } catch (error) {
        logError("HealthAccessPrompt init error", error);
      }
    })();

    return () => {
      state.cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isProfileLoaded]);

  const needsInstall = availability === "needsInstall";
  const needsUpdate = availability === "needsUpdate";

  const handlePrimary = async () => {
    if (needsInstall || needsUpdate) {
      sheetRef.current?.dismiss();
      await openHealthProviderInstall();
      return;
    }
    setIsConnecting(true);
    try {
      const result = await connectHealth(includeGlucose);
      sheetRef.current?.dismiss();
      if (result === "granted") {
        Toast.show({ text: `${healthPlatformName} подключён.` });
        await runner({ movement: true, glucose: true });
      } else {
        Toast.show({
          text: "Доступ не выдан. Подключить можно в Настройки → Здоровье.",
        });
      }
    } catch (error) {
      logError("HealthAccessPrompt connect error", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const primaryLabel = needsInstall
    ? "Установить Health Connect"
    : needsUpdate
      ? "Обновить Health Connect"
      : isConnecting
        ? "Подключение..."
        : "Подключить";

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.content}>
        <Text
          size="20"
          weight="700"
          color={getColor("foreground", undefined, theme)}
        >
          Подключить данные здоровья?
        </Text>
        <Text size="14" color={getColor("mutedForeground", undefined, theme)}>
          {includeGlucose
            ? `Teren покажет шаги и активность на главной и будет подтягивать показания глюкозы из ${healthPlatformName}.`
            : "Teren покажет шаги и активность на главной."}
        </Text>
        <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
          Только чтение. Подключить или отключить можно в Настройки → Здоровье.
        </Text>
        <Button
          variant="primary"
          size="base"
          disabled={isConnecting}
          onPress={() => void handlePrimary()}
          style={styles.button}
        >
          {primaryLabel}
        </Button>
        <Button
          variant="ghost"
          size="base"
          onPress={() => sheetRef.current?.dismiss()}
          style={styles.button}
        >
          Не сейчас
        </Button>
      </View>
    </BottomSheet>
  );
}

const createStyles = (_theme: ThemeName) => ({
  content: {
    padding: 20,
    gap: 10,
  },
  button: {
    height: 48,
  },
});
