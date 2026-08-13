import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  isHealthDataAvailable,
  requestAuthorization,
  queryQuantitySamples,
  queryStatisticsCollectionForQuantity,
} from "@kingstinct/react-native-healthkit";

const HEALTHKIT_CONNECTED_KEY = "healthkit_connected";

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function isHealthKitConnected(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  return (await SecureStore.getItemAsync(HEALTHKIT_CONNECTED_KEY)) === "true";
}

export async function connectHealthKit(
  includeGlucose: boolean
): Promise<boolean> {
  if (Platform.OS !== "ios" || !isHealthDataAvailable()) return false;

  const toRead: (
    | "HKQuantityTypeIdentifierStepCount"
    | "HKQuantityTypeIdentifierActiveEnergyBurned"
    | "HKQuantityTypeIdentifierDistanceWalkingRunning"
    | "HKQuantityTypeIdentifierBloodGlucose"
  )[] = [
    "HKQuantityTypeIdentifierStepCount",
    "HKQuantityTypeIdentifierActiveEnergyBurned",
    "HKQuantityTypeIdentifierDistanceWalkingRunning",
  ];
  if (includeGlucose) {
    toRead.push("HKQuantityTypeIdentifierBloodGlucose");
  }

  const granted = await requestAuthorization({ toRead });
  if (granted) {
    await SecureStore.setItemAsync(HEALTHKIT_CONNECTED_KEY, "true");
  }
  return granted;
}

export type MovementDay = {
  date: string;
  steps: number;
  activeEnergyKcal: number;
  distanceMeters: number;
};

export async function fetchRecentMovement(
  days: number
): Promise<MovementDay[]> {
  if (Platform.OS !== "ios") return [];

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const anchorDate = new Date(startOfToday);
  anchorDate.setDate(anchorDate.getDate() - (days - 1));

  const dateFilter = { startDate: anchorDate, endDate: now };

  const [stepsResult, energyResult, distanceResult] = await Promise.all([
    queryStatisticsCollectionForQuantity(
      "HKQuantityTypeIdentifierStepCount",
      ["cumulativeSum"],
      anchorDate,
      { day: 1 },
      { filter: { date: dateFilter }, unit: "count" }
    ),
    queryStatisticsCollectionForQuantity(
      "HKQuantityTypeIdentifierActiveEnergyBurned",
      ["cumulativeSum"],
      anchorDate,
      { day: 1 },
      { filter: { date: dateFilter }, unit: "kcal" }
    ),
    queryStatisticsCollectionForQuantity(
      "HKQuantityTypeIdentifierDistanceWalkingRunning",
      ["cumulativeSum"],
      anchorDate,
      { day: 1 },
      { filter: { date: dateFilter }, unit: "m" }
    ),
  ]);

  const byDate = (
    entries: readonly {
      startDate?: Date;
      sumQuantity?: { quantity: number };
    }[]
  ) =>
    new Map(
      entries
        .filter(
          (
            entry
          ): entry is { startDate: Date; sumQuantity?: { quantity: number } } =>
            entry.startDate !== undefined
        )
        .map((entry) => [
          toLocalDateString(entry.startDate),
          entry.sumQuantity?.quantity ?? 0,
        ])
    );

  const stepsByDate = byDate(stepsResult);
  const energyByDate = byDate(energyResult);
  const distanceByDate = byDate(distanceResult);

  const allDates = new Set([
    ...stepsByDate.keys(),
    ...energyByDate.keys(),
    ...distanceByDate.keys(),
  ]);

  return Array.from(allDates).map((date) => ({
    date,
    steps: Math.round(stepsByDate.get(date) ?? 0),
    activeEnergyKcal: Math.round(energyByDate.get(date) ?? 0),
    distanceMeters: Math.round(distanceByDate.get(date) ?? 0),
  }));
}

export type GlucoseSample = {
  value: number;
  unit: "mg/dL";
  recordedAt: number;
  healthKitUuid: string;
};

export async function fetchRecentGlucoseSamples(
  since: Date
): Promise<GlucoseSample[]> {
  if (Platform.OS !== "ios") return [];

  const samples = await queryQuantitySamples("HKQuantityTypeIdentifierBloodGlucose", {
    filter: { date: { startDate: since } },
    unit: "mg/dL",
    limit: 0,
    ascending: false,
  });

  return samples.map((sample) => ({
    value: sample.quantity,
    unit: "mg/dL",
    recordedAt: sample.startDate.getTime(),
    healthKitUuid: sample.uuid,
  }));
}
