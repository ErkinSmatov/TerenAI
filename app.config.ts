import type { ExpoConfig } from "expo/config";
import { withSentry } from "@sentry/react-native/expo";
import withIosMinDeploymentTarget from "./plugins/withIosMinDeploymentTarget";
import withHealthkitSwiftCompileFix from "./plugins/withHealthkitSwiftCompileFix";

const appVariant = process.env.APP_VARIANT;
const isDevelopment = appVariant === "development";

const getUniqueIdentifier = () => {
  if (isDevelopment) {
    return "com.codetau.terenai.dev";
  } else {
    return "com.codetau.terenai";
  }
};

const getAppName = () => {
  if (isDevelopment) {
    return "TerenAI (Dev)";
  } else {
    return "TerenAI";
  }
};

const config: ExpoConfig = {
  name: getAppName(),
  slug: "Calyo",
  version: "1.2.1",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "terenai",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: getUniqueIdentifier(),
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    usesAppleSignIn: false,  // было true
  },
  android: {
    package: getUniqueIdentifier(),
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#F9FAFB",
    },
    edgeToEdgeEnabled: true,
  },
  plugins: [
    "expo-secure-store",
    // "expo-apple-authentication", TODO
    "expo-router",
    "expo-localization",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        backgroundColor: "#F9FAFB",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "TerenAI использует камеру, чтобы вы могли фотографировать блюда, а ИИ рассчитывал калории и БЖУ.",
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "TerenAI нужен доступ к фотографиям, чтобы вы могли загружать снимки еды для анализа калорийности.",
      },
    ],
    [
      "@kingstinct/react-native-healthkit",
      {
        NSHealthShareUsageDescription:
          "TerenAI использует Apple Health, чтобы показывать вашу активность и (если есть) данные о глюкозе.",
        NSHealthUpdateUsageDescription:
          "TerenAI не записывает данные в Apple Health.",
        background: false,
      },
    ],
    [
      "expo-build-properties",
      {
        // react-native-nitro-modules (используется @kingstinct/react-native-healthkit)
        // требует C++ interop, для которого CxxStdlib собран с минимальным
        // deployment target iOS 16.0 — ниже этого сборка падает на этапе EmitSwiftModule.
        ios: {
          deploymentTarget: "16.0",
        },
      },
    ],
    [withIosMinDeploymentTarget, { deploymentTarget: "16.0" }] as unknown as [
      string,
      unknown,
    ],
    withHealthkitSwiftCompileFix as unknown as string,
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    APP_VARIANT: appVariant,
    eas: {
      projectId: "616f0145-400b-4a1e-99d8-efea2681653f",
    },
  },
  owner: "smatove",
};

// withSentry подключает нативную часть SDK и автозагрузку sourcemaps при сборке.
// Токен здесь НЕ передаётся намеренно — плагин берёт его из переменной окружения
// SENTRY_AUTH_TOKEN, которую EAS подставляет в окружение сборки. Слаги секретами
// не являются.
export default (): ExpoConfig =>
  withSentry(config, {
    url: "https://sentry.io/",
    organization: "codetau-et",
    project: "terenai",
  });
