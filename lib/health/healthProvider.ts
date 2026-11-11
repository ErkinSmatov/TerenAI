// Платформенный фасад здоровья: iOS -> HealthKit, Android -> Health Connect.
// Экраны и хуки импортируют только его.
import { Linking, Platform } from "react-native";
import {
  connectHealthKit,
  fetchRecentGlucoseSamples,
  fetchRecentMovement,
  getHealthKitAvailability,
  isHealthKitConnected,
} from "./healthKit";
import { resolveGlucoseUnit } from "./healthMapping";
import type {
  GlucoseUnit,
  HealthAvailability,
  HealthConnectResult,
  HealthGlucoseSample,
  HealthSource,
  MovementDay,
} from "./healthTypes";

export const isHealthPlatformSupported: boolean =
  Platform.OS === "ios" || Platform.OS === "android";

export const healthPlatformName: string =
  Platform.OS === "ios"
    ? "Apple Health"
    : Platform.OS === "android"
      ? "Health Connect"
      : "";

export const healthSource: HealthSource | null =
  Platform.OS === "ios"
    ? "healthkit"
    : Platform.OS === "android"
      ? "healthconnect"
      : null;

// iOS берёт единицу глюкозы из Apple Health, Android - из последнего ручного ввода
export const needsPreferredGlucoseUnit: boolean = Platform.OS === "android";

// Ленивая загрузка: на iOS модуль react-native-health-connect не загружается.
// Вызывается только в ветках Platform.OS === "android".
function getHealthConnect(): typeof import("./healthConnect") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./healthConnect") as typeof import("./healthConnect");
}

export async function getHealthAvailability(): Promise<HealthAvailability> {
  if (Platform.OS === "ios") return getHealthKitAvailability();
  if (Platform.OS === "android") {
    return getHealthConnect().getHealthConnectAvailability();
  }
  return "unsupported";
}

export async function isHealthConnected(): Promise<boolean> {
  if (Platform.OS === "ios") return isHealthKitConnected();
  if (Platform.OS === "android") {
    return getHealthConnect().isHealthConnectConnected();
  }
  return false;
}

export async function connectHealth(
  includeGlucose: boolean
): Promise<HealthConnectResult> {
  if (Platform.OS === "ios") {
    if (getHealthKitAvailability() !== "available") return "unsupported";
    return (await connectHealthKit(includeGlucose)) ? "granted" : "denied";
  }
  if (Platform.OS === "android") {
    return getHealthConnect().connectHealthConnect(includeGlucose);
  }
  return "unsupported";
}

export async function fetchMovement(days: number): Promise<MovementDay[]> {
  if (Platform.OS === "ios") return fetchRecentMovement(days);
  if (Platform.OS === "android") {
    return getHealthConnect().fetchHealthConnectMovement(days);
  }
  return [];
}

export async function fetchGlucoseSamples(
  since: Date,
  preferredUnit: GlucoseUnit | null
): Promise<HealthGlucoseSample[]> {
  if (Platform.OS === "ios") {
    const samples = await fetchRecentGlucoseSamples(since);
    return samples.map((s) => ({
      value: s.value,
      unit: s.unit,
      recordedAt: s.recordedAt,
      externalId: s.healthKitUuid,
    }));
  }
  if (Platform.OS === "android") {
    return getHealthConnect().fetchHealthConnectGlucose(
      since,
      resolveGlucoseUnit(preferredUnit)
    );
  }
  return [];
}

export function openHealthPermissionSettings(): void {
  if (Platform.OS === "ios") {
    void Linking.openSettings();
  } else if (Platform.OS === "android") {
    getHealthConnect().openHealthConnectPermissionsSettings();
  }
}

export async function openHealthProviderInstall(): Promise<void> {
  if (Platform.OS === "android") {
    await getHealthConnect().openHealthConnectInstall();
  }
}
