import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  fetchGlucoseSamples,
  fetchMovement,
  healthSource,
  isHealthConnected,
  isHealthPlatformSupported,
  needsPreferredGlucoseUnit,
} from "@/lib/health/healthProvider";
import {
  getLastGlucoseSync,
  setLastGlucoseSync,
} from "@/lib/health/healthSyncState";
import { logHealthKitSync } from "@/lib/health/logHealthKitSync";
import {
  syncHealthData,
  type HealthSyncChannels,
  type HealthSyncResult,
} from "@/lib/health/syncHealthData";

export type HealthSyncRun = {
  connected: boolean;
  glucoseRan: boolean;
  result: HealthSyncResult | null;
};

const NOT_RUN: HealthSyncRun = {
  connected: false,
  glucoseRan: false,
  result: null,
};

// Связывает фасад здоровья, мутации Convex и оркестрацию syncHealthData.
// Ошибки не глотаются: вызывающий делает logError и Toast.
export default function useHealthSyncRunner(
  includeGlucose: boolean
): (channels: HealthSyncChannels) => Promise<HealthSyncRun> {
  const syncMovementDays = useMutation(api.movement.syncDays.default);
  const importGlucoseReadings = useMutation(
    api.glucose.importGlucoseReadings.default
  );
  const profile = useQuery(api.profiles.getProfile.default);
  const lastManualUnit = useQuery(
    api.glucose.getLastManualUnit.default,
    needsPreferredGlucoseUnit && includeGlucose ? {} : "skip"
  );
  const userId = profile?.userId;

  return useCallback(
    async (channels: HealthSyncChannels): Promise<HealthSyncRun> => {
      const source = healthSource;
      if (!isHealthPlatformSupported || source === null) return NOT_RUN;
      if (!(await isHealthConnected())) return NOT_RUN;

      // Пока единица грузится, глюкоза откладывается: иначе у пользователя
      // с ручными мг/дл первые показания сохранились бы в ммоль/л
      const glucoseAllowed =
        channels.glucose &&
        includeGlucose &&
        userId !== undefined &&
        (!needsPreferredGlucoseUnit || lastManualUnit !== undefined);

      const result = await syncHealthData(
        {
          fetchRecentMovement: fetchMovement,
          fetchGlucoseSamples: (since) =>
            fetchGlucoseSamples(since, lastManualUnit ?? null),
          syncMovementDays: (days) => syncMovementDays({ days }),
          importGlucoseBatch: (batch) =>
            importGlucoseReadings({ source, readings: batch }),
          getLastGlucoseSync: () =>
            userId === undefined ? null : getLastGlucoseSync(userId),
          setLastGlucoseSync: (ms) => {
            if (userId !== undefined) setLastGlucoseSync(userId, ms);
          },
          now: Date.now,
          log: logHealthKitSync,
        },
        { movement: channels.movement, glucose: glucoseAllowed }
      );
      return { connected: true, glucoseRan: glucoseAllowed, result };
    },
    [
      includeGlucose,
      userId,
      lastManualUnit,
      syncMovementDays,
      importGlucoseReadings,
    ]
  );
}
