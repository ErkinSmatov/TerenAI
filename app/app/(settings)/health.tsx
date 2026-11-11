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
import { AppState, Linking, View, Platform } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import getColor from "@/lib/ui/getColor";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import { hasHealthBlocks } from "@/lib/profile/hasHealthBlocks";
import { useThemeContext } from "@/context/ThemeContext";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import type { ThemeName } from "@/lib/ui/palettes";
import logError from "@/lib/utils/logError";
import useHealthSyncRunner from "@/lib/hooks/useHealthSyncRunner";
import {
  connectHealth,
  getHealthAvailability,
  healthPlatformName,
  isHealthConnected,
  isHealthPlatformSupported,
  openHealthPermissionSettings,
  openHealthProviderInstall,
} from "@/lib/health/healthProvider";
import type { HealthAvailability } from "@/lib/health/healthTypes";

const PRIVACY_POLICY_URL =
  "https://docs.google.com/document/d/e/2PACX-1vTyNCLjuAHdtZmdZQpIfOolwZ2nE7pA5kKTH3jrszZEgkSzfJMMBXdawf7yva_GFIoMiJ9vS63IplTy/pub";

const IS_ANDROID = Platform.OS === "android";

export default function HealthScreen() {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const { scrollY, onScroll } = useScrollY();
  const profile = useQuery(api.profiles.getProfile.default);
  const isGlucometerTrack = hasHealthBlocks(profile?.data?.goalTrack);
  const runner = useHealthSyncRunner(isGlucometerTrack);

  const [availability, setAvailability] = useState<HealthAvailability | null>(
    null,
  );
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState<"denied" | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      const [nextAvailability, nextConnected] = await Promise.all([
        getHealthAvailability(),
        isHealthConnected(),
      ]);
      setAvailability(nextAvailability);
      setIsConnected(nextConnected);
    } catch (error) {
      logError("HealthScreen refresh error", error);
    }
  }, []);

  // Пользователь возвращается из Play Маркета или настроек Health Connect
  useEffect(() => {
    void refreshState();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshState();
    });
    return () => {
      subscription.remove();
    };
  }, [refreshState]);

  const handleConnect = async () => {
    setIsSyncing(true);
    try {
      const result = await connectHealth(isGlucometerTrack);
      if (result === "granted") {
        setIsConnected(true);
        setLastResult(null);
        await runner({ movement: true, glucose: true });
        Toast.show({ text: `${healthPlatformName} подключён.` });
      } else if (result === "denied") {
        setLastResult("denied");
        Toast.show({
          text: `Доступ к ${healthPlatformName} не выдан.`,
          variant: "error",
        });
      } else {
        await refreshState();
      }
    } catch (error) {
      logError("HealthScreen connect error", error);
      Toast.show({
        text: "Не удалось синхронизировать данные здоровья.",
        variant: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const mutedColor = getColor("mutedForeground", undefined, theme);
  const foregroundColor = getColor("foreground", undefined, theme);

  const renderBody = () => {
    if (!isHealthPlatformSupported || availability === "unsupported") {
      return (
        <Text size="14" color={mutedColor}>
          {IS_ANDROID
            ? "Health Connect не поддерживается на этом устройстве."
            : "На этом устройстве данные здоровья недоступны."}
        </Text>
      );
    }

    if (availability === null) return null;

    if (availability === "needsInstall" || availability === "needsUpdate") {
      const isInstall = availability === "needsInstall";
      return (
        <>
          <Text size="14" color={mutedColor}>
            {isInstall
              ? "Для подключения установите приложение Health Connect из Google Play."
              : "Обновите Health Connect, чтобы подключить данные."}
          </Text>
          <Button
            variant="primary"
            size="base"
            onPress={() => void openHealthProviderInstall()}
            style={styles.button}
          >
            {isInstall
              ? "Установить Health Connect"
              : "Обновить Health Connect"}
          </Button>
        </>
      );
    }

    return (
      <>
        <Card style={styles.card}>
          <View style={styles.row}>
            <ActivityIcon size={20} color={foregroundColor} />
            <Text size="14" color={foregroundColor}>
              Шаги, калории, дистанция
            </Text>
          </View>
          {isGlucometerTrack && (
            <View style={styles.row}>
              <HeartPulseIcon size={20} color={foregroundColor} />
              <Text size="14" color={foregroundColor}>
                Глюкоза (если есть в {healthPlatformName})
              </Text>
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
              : `Подключить ${healthPlatformName}`}
        </Button>

        {(lastResult === "denied" || isConnected) && (
          <>
            <Button
              variant="secondary"
              size="base"
              onPress={openHealthPermissionSettings}
              style={styles.button}
            >
              {IS_ANDROID
                ? "Открыть настройки Health Connect"
                : "Открыть настройки"}
            </Button>
            <Text size="12" color={mutedColor} style={styles.hint}>
              Если система больше не показывает запрос, выдайте доступ вручную в{" "}
              {healthPlatformName}.
            </Text>
          </>
        )}

        {IS_ANDROID && isConnected && (
          <Text size="12" color={mutedColor} style={styles.hint}>
            Если шагов нет, включите запись активности в Google Fit, Samsung
            Health или другом приложении и разрешите ему доступ в Health
            Connect.
          </Text>
        )}
      </>
    );
  };

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
          title={healthPlatformName || "Здоровье"}
          description={
            isGlucometerTrack
              ? `Подключите ${healthPlatformName}, чтобы Teren забирал шаги, активность и данные о глюкозе.`
              : `Подключите ${healthPlatformName}, чтобы Teren забирал шаги и активность.`
          }
        />

        {renderBody()}

        <View style={styles.privacy}>
          <Text size="14" weight="600" color={foregroundColor}>
            Как используются данные
          </Text>
          <Text size="12" color={mutedColor}>
            {`Teren только читает данные: шаги, активную энергию, дистанцию${
              isGlucometerTrack ? ", глюкозу" : ""
            }. Данные не записываются в ${healthPlatformName}, не используются для рекламы и не передаются третьим лицам.`}
          </Text>
          <Text
            size="12"
            weight="600"
            color={foregroundColor}
            style={styles.link}
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          >
            Политика конфиденциальности
          </Text>
        </View>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const createStyles = (_theme: ThemeName) => ({
  card: {
    gap: 12,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  button: {
    marginTop: 16,
    height: 48,
  },
  hint: {
    marginTop: 12,
  },
  privacy: {
    marginTop: 24,
    gap: 6,
  },
  link: {
    textDecorationLine: "underline" as const,
  },
});
