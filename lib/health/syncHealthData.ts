// Оркестрация синхронизации здоровья с внедряемыми зависимостями.
// Без RN/Expo/Convex/Sentry, чтобы гонять в verify-скрипте.
import { computeSince, prepareGlucoseBatches } from "./healthMapping";
import type { HealthGlucoseSample, MovementDay } from "./healthTypes";

export const MOVEMENT_SYNC_DAYS = 8;

export type HealthSyncChannels = { movement: boolean; glucose: boolean };

export type HealthSyncDeps = {
  fetchRecentMovement: (days: number) => Promise<MovementDay[]>;
  fetchGlucoseSamples: (since: Date) => Promise<HealthGlucoseSample[]>;
  syncMovementDays: (days: MovementDay[]) => Promise<unknown>;
  importGlucoseBatch: (batch: HealthGlucoseSample[]) => Promise<number>;
  getLastGlucoseSync: () => number | null;
  setLastGlucoseSync: (ms: number) => void;
  now: () => number;
  log: (stage: string, payload: Record<string, string | number>) => void;
};

export type HealthSyncResult = {
  movementDays: number;
  glucoseFetched: number;
  glucoseImported: number;
  glucoseBatches: number;
};

// Ошибки не перехватываются: вызывающий логирует, lastSync при сбое не меняется.
// В log попадают только счётчики и даты, никогда значения здоровья.
export async function syncHealthData(
  deps: HealthSyncDeps,
  channels: HealthSyncChannels
): Promise<HealthSyncResult> {
  const result: HealthSyncResult = {
    movementDays: 0,
    glucoseFetched: 0,
    glucoseImported: 0,
    glucoseBatches: 0,
  };

  if (channels.movement) {
    const days = await deps.fetchRecentMovement(MOVEMENT_SYNC_DAYS);
    const latest = days.length > 0 ? days[days.length - 1].date : "none";
    deps.log("movement-fetched", { count: days.length, latestDate: latest });
    if (days.length > 0) {
      await deps.syncMovementDays(days);
    }
    result.movementDays = days.length;
  }

  if (channels.glucose) {
    const startedAt = deps.now();
    const since = computeSince(deps.getLastGlucoseSync(), startedAt);
    const samples = await deps.fetchGlucoseSamples(new Date(since));
    const batches = prepareGlucoseBatches(samples);
    deps.log("glucose-fetched", {
      count: samples.length,
      batches: batches.length,
      sinceIso: new Date(since).toISOString(),
    });

    let imported = 0;
    // Последовательно, чтобы не создавать пик нагрузки на деплоймент
    for (const batch of batches) {
      imported += await deps.importGlucoseBatch(batch);
    }
    // lastSync пишем только после успешной отправки всех пачек
    deps.setLastGlucoseSync(startedAt);
    deps.log("glucose-imported", { imported, batches: batches.length });

    result.glucoseFetched = samples.length;
    result.glucoseImported = imported;
    result.glucoseBatches = batches.length;
  }

  return result;
}
