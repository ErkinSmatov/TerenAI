import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  fetchRecentGlucoseSamples,
  fetchRecentMovement,
  isHealthKitConnected,
} from "@/lib/health/healthKit";
import logError from "@/lib/utils/logError";

export default function useHealthKitSync(includeGlucose: boolean): void {
  const syncMovementDays = useMutation(api.movement.syncDays.default);
  const importGlucoseReadings = useMutation(
    api.glucose.importHealthKitReadings.default
  );
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    void (async () => {
      try {
        const connected = await isHealthKitConnected();
        if (!connected) return;

        const days = await fetchRecentMovement(8);
        if (days.length > 0) {
          await syncMovementDays({ days });
        }

        if (includeGlucose) {
          const since = new Date();
          since.setDate(since.getDate() - 30);
          const readings = await fetchRecentGlucoseSamples(since);
          if (readings.length > 0) {
            await importGlucoseReadings({ readings });
          }
        }
      } catch (error) {
        logError("useHealthKitSync error", error);
      }
    })();
  }, [includeGlucose, syncMovementDays, importGlucoseReadings]);
}
