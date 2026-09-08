import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { api } from "@/convex/_generated/api";
import logError from "@/lib/utils/logError";
import { useAuthContext } from "@/context/AuthContext";

// Не чаще раза в 6 часов: держит `timezoneOffsetMinutes` актуальным при
// переезде пользователя/переходе на летнее-зимнее время, но не дёргает
// сервер при каждом переключении приложения переднего/заднего плана.
const REGISTRATION_THROTTLE_MS = 6 * 60 * 60 * 1000;

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
});

// `Constants.expoConfig?.extra` не типизирован точнее `Record<string, any>`
// в `@expo/config-types` — сужаем до ожидаемой формы явным типом, не
// подавляя проверку типов целиком, чтобы `projectId` дальше был безопасным
// `string | undefined`.
type ExpoExtra = { eas?: { projectId?: string } };

export default function NotificationsProvider() {
  const router = useRouter();
  const recordPushToken = useMutation(api.notifications.recordPushToken.default);
  const lastRegistrationRef = useRef<number>(0);
  const { isAuthenticated } = useAuthContext();

  useEffect(() => {
    // Регистрация до входа в аккаунт гарантированно падает в recordPushToken
    // с "Unauthorized" (getAuthUserId возвращает null) — сама попытка ничего
    // не делает и просто засоряет логи/Sentry. Эффект также перезапускается
    // сразу при переходе isAuthenticated false -> true (не дожидаясь
    // следующего AppState "active"), иначе токен не регистрируется в течение
    // всей сессии, если пользователь вошёл и не сворачивал приложение.
    if (!isAuthenticated) return;

    const registerForPushNotifications = async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const currentPermissions = await Notifications.getPermissionsAsync();
        let finalStatus = currentPermissions.status;

        if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
          const requestedPermissions =
            await Notifications.requestPermissionsAsync();
          finalStatus = requestedPermissions.status;
        }

        if (finalStatus !== Notifications.PermissionStatus.GRANTED) return;

        const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
        const projectId = extra?.eas?.projectId;
        if (!projectId) {
          logError(
            "NotificationsProvider registration error",
            new Error("Missing extra.eas.projectId")
          );
          return;
        }

        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        lastRegistrationRef.current = Date.now();

        await recordPushToken({
          expoPushToken: token,
          platform: Platform.OS === "android" ? "android" : "ios",
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        });
      } catch (error) {
        logError("NotificationsProvider registration error", error);
      }
    };

    void registerForPushNotifications();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state !== "active") return;
        const msSinceLastRegistration = Date.now() - lastRegistrationRef.current;
        if (msSinceLastRegistration < REGISTRATION_THROTTLE_MS) return;
        void registerForPushNotifications();
      }
    );

    return () => {
      appStateSubscription.remove();
    };
  }, [recordPushToken, isAuthenticated]);

  useEffect(() => {
    const navigateFromNotificationUrl = (url: unknown) => {
      if (url === "/app/(settings)/weeklyWeighIn") {
        router.push("/app/(settings)/weeklyWeighIn");
      } else {
        router.push("/app");
      }
    };

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        navigateFromNotificationUrl(
          response.notification.request.content.data.url
        );
      });

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- getLastNotificationResponse() (sync) не покрывает холодный старт до готовности нативного модуля так же надёжно, как задокументировано в expo-notifications; используем async-вариант умышленно.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        navigateFromNotificationUrl(
          response.notification.request.content.data.url
        );
      })
      .catch((error: unknown) => {
        logError("NotificationsProvider cold start response error", error);
      });

    return () => {
      responseSubscription.remove();
    };
  }, [router]);

  return null;
}
