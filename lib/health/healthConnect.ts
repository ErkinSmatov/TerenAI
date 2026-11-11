// Реализация Health Connect (Android). На верхнем уровне модуля нет вызовов
// библиотеки: все обращения только внутри функций после проверки платформы.
import { Linking, Platform } from "react-native";
import {
  aggregateGroupByPeriod,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";
import logError from "@/lib/utils/logError";
import { mapHealthConnectGlucose, mergeMovementAggregates } from "./healthMapping";
import type {
  AggregatePoint,
  GlucoseUnit,
  HealthAvailability,
  HealthConnectGlucoseRecordInput,
  HealthConnectResult,
  HealthGlucoseSample,
  MovementDay,
} from "./healthTypes";

const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";
const BASE_RECORD_TYPES = ["Steps", "ActiveCaloriesBurned", "Distance"] as const;
const GLUCOSE_PAGE_SIZE = 1000;
// Страховка от бесконечной пагинации
const MAX_GLUCOSE_PAGES = 50;

export async function getHealthConnectAvailability(): Promise<HealthAvailability> {
  if (Platform.OS !== "android") return "unsupported";
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return "available";
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return "needsUpdate";
    }
    const version = Platform.Version;
    // На Android 14+ Health Connect встроен: недоступен значит не поддерживается
    if (version >= 34) return "unsupported";
    if (version >= 28) return "needsInstall";
    return "unsupported";
  } catch (error) {
    logError("getHealthConnectAvailability error", error);
    return "unsupported";
  }
}

let initPromise: Promise<boolean> | null = null;

// Вызывается только из функций, прошедших проверку платформы
function ensureInitialized(): Promise<boolean> {
  initPromise ??=
    initialize().then(
      (ok) => {
        if (!ok) initPromise = null;
        return ok;
      },
      (error: unknown) => {
        initPromise = null;
        throw error;
      }
    );
  return initPromise;
}

async function getGrantedReadTypes(): Promise<Set<string>> {
  const granted = await getGrantedPermissions();
  return new Set(
    granted.filter((p) => p.accessType === "read").map((p) => p.recordType)
  );
}

export async function connectHealthConnect(
  includeGlucose: boolean
): Promise<HealthConnectResult> {
  if (Platform.OS !== "android") return "unsupported";
  try {
    const availability = await getHealthConnectAvailability();
    if (availability !== "available") return availability;
    if (!(await ensureInitialized())) return "unsupported";

    const permissions: { accessType: "read"; recordType: string }[] =
      BASE_RECORD_TYPES.map((recordType) => ({ accessType: "read", recordType }));
    if (includeGlucose) {
      permissions.push({ accessType: "read", recordType: "BloodGlucose" });
    }
    const granted = await requestPermission(
      permissions as Parameters<typeof requestPermission>[0]
    );
    const hasBase = granted.some(
      (p) =>
        p.accessType === "read" &&
        (BASE_RECORD_TYPES as readonly string[]).includes(p.recordType)
    );
    return hasBase ? "granted" : "denied";
  } catch (error) {
    logError("connectHealthConnect error", error);
    return "denied";
  }
}

export async function isHealthConnectConnected(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    if ((await getHealthConnectAvailability()) !== "available") return false;
    if (!(await ensureInitialized())) return false;
    const types = await getGrantedReadTypes();
    return BASE_RECORD_TYPES.some((t) => types.has(t));
  } catch (error) {
    logError("isHealthConnectConnected error", error);
    return false;
  }
}

export async function fetchHealthConnectMovement(
  days: number
): Promise<MovementDay[]> {
  if (Platform.OS !== "android") return [];
  if (!(await ensureInitialized())) return [];

  const now = new Date();
  const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  anchor.setDate(anchor.getDate() - (days - 1));
  const timeRangeFilter = {
    operator: "between" as const,
    startTime: anchor.toISOString(),
    endTime: now.toISOString(),
  };
  const timeRangeSlicer = { period: "DAYS" as const, length: 1 };

  const granted = await getGrantedReadTypes();

  // Невыданный тип бросает SecurityException, поэтому читаем только выданные
  const steps: AggregatePoint[] = granted.has("Steps")
    ? (
        await aggregateGroupByPeriod({
          recordType: "Steps",
          timeRangeFilter,
          timeRangeSlicer,
        })
      ).map((g) => {
        // Для дней без записей Health Connect может вернуть группу без поля,
        // хотя в типах оно обязательное: читаем как необязательное
        const result: Partial<typeof g.result> = g.result;
        return { startTime: g.startTime, value: result.COUNT_TOTAL ?? 0 };
      })
    : [];
  const energy: AggregatePoint[] = granted.has("ActiveCaloriesBurned")
    ? (
        await aggregateGroupByPeriod({
          recordType: "ActiveCaloriesBurned",
          timeRangeFilter,
          timeRangeSlicer,
        })
      ).map((g) => {
        const result: Partial<typeof g.result> = g.result;
        return {
          startTime: g.startTime,
          value: result.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0,
        };
      })
    : [];
  const distance: AggregatePoint[] = granted.has("Distance")
    ? (
        await aggregateGroupByPeriod({
          recordType: "Distance",
          timeRangeFilter,
          timeRangeSlicer,
        })
      ).map((g) => {
        const result: Partial<typeof g.result> = g.result;
        return {
          startTime: g.startTime,
          value: result.DISTANCE?.inMeters ?? 0,
        };
      })
    : [];

  return mergeMovementAggregates(steps, energy, distance);
}

export async function fetchHealthConnectGlucose(
  since: Date,
  unit: GlucoseUnit
): Promise<HealthGlucoseSample[]> {
  if (Platform.OS !== "android") return [];
  if (!(await ensureInitialized())) return [];
  if (!(await getGrantedReadTypes()).has("BloodGlucose")) return [];

  const timeRangeFilter = {
    operator: "between" as const,
    startTime: since.toISOString(),
    endTime: new Date().toISOString(),
  };
  const inputs: HealthConnectGlucoseRecordInput[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_GLUCOSE_PAGES; page++) {
    const res = await readRecords("BloodGlucose", {
      timeRangeFilter,
      ascendingOrder: false,
      pageSize: GLUCOSE_PAGE_SIZE,
      pageToken,
    });
    for (const r of res.records) {
      inputs.push({
        id: r.metadata?.id,
        time: r.time,
        mmolPerL: r.level.inMillimolesPerLiter,
        mgPerDl: r.level.inMilligramsPerDeciliter,
      });
    }
    // Пустой токен ("" тоже) означает конец данных
    if (!res.pageToken) break;
    pageToken = res.pageToken;
  }
  return mapHealthConnectGlucose(inputs, unit);
}

export function openHealthConnectPermissionsSettings(): void {
  if (Platform.OS !== "android") return;
  try {
    openHealthConnectSettings();
  } catch (error) {
    logError("openHealthConnectPermissionsSettings error", error);
  }
}

export async function openHealthConnectInstall(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Linking.openURL(`market://details?id=${HEALTH_CONNECT_PACKAGE}`);
  } catch {
    try {
      await Linking.openURL(
        `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`
      );
    } catch (error) {
      logError("openHealthConnectInstall error", error);
    }
  }
}
