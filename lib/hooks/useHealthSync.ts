import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import useHealthSyncRunner from "@/lib/hooks/useHealthSyncRunner";
import { logHealthKitSync } from "@/lib/health/logHealthKitSync";
import logError from "@/lib/utils/logError";

// Не чаще раза в 5 минут: без троттлинга каждое переключение приложения
// передний/задний план порождает нативные запросы + Convex-мутации
// (T-68-01, самонаведённый DoS на собственный деплоймент и AI-квоту).
const SYNC_THROTTLE_MS = 5 * 60 * 1000;

export default function useHealthSync(includeGlucose: boolean): void {
  const runner = useHealthSyncRunner(includeGlucose);
  // Метки времени по каналам раздельно, только в памяти: холодный старт
  // синхронизируется всегда, а включение глюкозы после догрузки профиля не
  // блокируется троттлингом движения.
  const lastMovementSyncRef = useRef<number>(0);
  const lastGlucoseSyncRef = useRef<number>(0);
  // Защита от параллельных запусков (двойная отправка пачек).
  const inFlightRef = useRef<boolean>(false);

  useEffect(() => {
    const runSync = async () => {
      if (inFlightRef.current) {
        logHealthKitSync("skipped-in-flight", {});
        return;
      }

      const now = Date.now();
      const msSinceLastMovement = now - lastMovementSyncRef.current;
      const movement = msSinceLastMovement >= SYNC_THROTTLE_MS;
      if (!movement) {
        logHealthKitSync("skipped-throttle", {
          channel: "movement",
          msSinceLast: msSinceLastMovement,
        });
      }

      const msSinceLastGlucose = now - lastGlucoseSyncRef.current;
      const glucose = includeGlucose && msSinceLastGlucose >= SYNC_THROTTLE_MS;
      if (includeGlucose && !glucose) {
        logHealthKitSync("skipped-throttle", {
          channel: "glucose",
          msSinceLast: msSinceLastGlucose,
        });
      }

      if (!movement && !glucose) return;

      inFlightRef.current = true;
      if (movement) lastMovementSyncRef.current = now;
      try {
        const run = await runner({ movement, glucose });
        // Глюкоза, отложенная до загрузки единицы/профиля, троттлингом не блокируется.
        if (run.glucoseRan) lastGlucoseSyncRef.current = now;
      } catch (error) {
        logError("useHealthSync error", error);
      } finally {
        inFlightRef.current = false;
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
  }, [includeGlucose, runner]);
}
