import type { ExpoConfig } from "expo/config";

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

export default (): ExpoConfig => ({
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
});
