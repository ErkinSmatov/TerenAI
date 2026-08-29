import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { AppState, AppStateStatus } from "react-native";
import { api } from "@/convex/_generated/api";
import {
  fetchRecentGlucoseSamples,
  fetchRecentMovement,
  isHealthKitConnected,
} from "@/lib/health/healthKit";
import { logHealthKitSync } from "@/lib/health/logHealthKitSync";
import logError from "@/lib/utils/logError";

// Не чаще раза в 5 минут: без троттлинга каждое переключение приложения
// передний/задний план порождает 3 нативных запроса + до 2 Convex-мутаций
// (T-68-01, самонаведённый DoS на собственный деплоймент и AI-квоту).
const SYNC_THROTTLE_MS = 5 * 60 * 1000;

export default function useHealthKitSync(includeGlucose: boolean): void {
  const syncMovementDays = useMutation(api.movement.syncDays.default);
  const importGlucoseReadings = useMutation(
    api.glucose.importHealthKitReadings.default
  );
  // Метки времени последней запущенной синхронизации по каждому каналу
  // отдельно, только в памяти — холодный старт обязан синхронизироваться
  // всегда, поэтому это не персистится в SecureStore. Раздельные рефы (а не
  // один общий) нужны, чтобы включение глюкозы после того, как профиль
  // догрузился (isGlucometerTrack стал true уже после первого запуска
  // движения), не блокировалось троттлингом, выставленным для движения.
  const lastMovementSyncRef = useRef<number>(0);
  const lastGlucoseSyncRef = useRef<number>(0);

  useEffect(() => {
    const runSync = async () => {
      const now = Date.now();

      try {
        const connected = await isHealthKitConnected();
        if (!connected) return;

        const msSinceLastMovement = now - lastMovementSyncRef.current;
        if (msSinceLastMovement < SYNC_THROTTLE_MS) {
          logHealthKitSync("skipped-throttle", {
            channel: "movement",
            msSinceLast: msSinceLastMovement,
          });
        } else {
          lastMovementSyncRef.current = now;
          const days = await fetchRecentMovement(8);
          logHealthKitSync("movement-fetched", {
            count: days.length,
            latestDate:
              days.length > 0
                ? days.reduce((latest, day) => (day.date > latest ? day.date : latest), days[0].date)
                : "none",
          });
          if (days.length > 0) {
            await syncMovementDays({ days });
          }
        }

        if (includeGlucose) {
          const msSinceLastGlucose = now - lastGlucoseSyncRef.current;
          if (msSinceLastGlucose < SYNC_THROTTLE_MS) {
            logHealthKitSync("skipped-throttle", {
              channel: "glucose",
              msSinceLast: msSinceLastGlucose,
            });
          } else {
            lastGlucoseSyncRef.current = now;
            const since = new Date();
            since.setDate(since.getDate() - 30);
            const readings = await fetchRecentGlucoseSamples(since);
            logHealthKitSync("glucose-fetched", {
              count: readings.length,
              latestRecordedAt:
                readings.length > 0
                  ? new Date(
                      readings.reduce(
                        (latest, reading) =>
                          reading.recordedAt > latest ? reading.recordedAt : latest,
                        readings[0].recordedAt
                      )
                    ).toISOString()
                  : "none",
            });
            if (readings.length > 0) {
              await importGlucoseReadings({ readings });
            }
          }
        }
      } catch (error) {
        logError("useHealthKitSync error", error);
      }
    };

    void runSync();

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          void runSync();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [includeGlucose, syncMovementDays, importGlucoseReadings]);
}
