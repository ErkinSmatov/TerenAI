// Чистые функции маппинга и подготовки данных здоровья.
// Без RN/Expo/алиасов `@/`, чтобы работало в ts-node.
import { isGlucoseValueValid } from "./healthRanges";
import type {
  AggregatePoint,
  GlucoseUnit,
  HealthConnectGlucoseRecordInput,
  HealthGlucoseSample,
  MovementDay,
} from "./healthTypes";

export const GLUCOSE_BATCH_SIZE = 200;
export const MAX_LOOKBACK_DAYS = 30;
export const DAY_MS = 86400000;
// Перекрытие 24 ч — страховка от опоздавших записей CGM, дубли гасит сервер
export const OVERLAP_MS = DAY_MS;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("Размер пачки должен быть целым числом >= 1");
  }
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

// Начало окна выборки: max(lastSync - 24 ч, now - 30 дней)
export function computeSince(lastSyncAt: number | null, nowMs: number): number {
  const floor = nowMs - MAX_LOOKBACK_DAYS * DAY_MS;
  if (
    lastSyncAt === null ||
    typeof lastSyncAt !== "number" ||
    !Number.isFinite(lastSyncAt) ||
    lastSyncAt > nowMs
  ) {
    return floor;
  }
  return Math.max(lastSyncAt - OVERLAP_MS, floor);
}

// Дата локальная по нативному слою — никаких Date-конвертаций
export function dateKeyFromLocalDateTime(startTime: string): string | null {
  const key = startTime.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

function sanitize(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

export function mergeMovementAggregates(
  steps: AggregatePoint[],
  energy: AggregatePoint[],
  distance: AggregatePoint[]
): MovementDay[] {
  const byDate = new Map<string, MovementDay>();
  const apply = (
    points: AggregatePoint[],
    field: "steps" | "activeEnergyKcal" | "distanceMeters"
  ): void => {
    for (const point of points) {
      const key = dateKeyFromLocalDateTime(point.startTime);
      if (key === null) continue;
      let day = byDate.get(key);
      if (!day) {
        day = { date: key, steps: 0, activeEnergyKcal: 0, distanceMeters: 0 };
        byDate.set(key, day);
      }
      day[field] = sanitize(point.value);
    }
  };
  apply(steps, "steps");
  apply(energy, "activeEnergyKcal");
  apply(distance, "distanceMeters");
  return [...byDate.values()].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );
}

export function roundGlucose(value: number, unit: GlucoseUnit): number {
  return unit === "mmol/L" ? Math.round(value * 10) / 10 : Math.round(value);
}

// Единица последнего ручного показания, иначе ммоль/л (рынок RU/KZ)
export function resolveGlucoseUnit(
  lastManualUnit: GlucoseUnit | null | undefined
): GlucoseUnit {
  return lastManualUnit ?? "mmol/L";
}

// Префикс исключает коллизию с UUID HealthKit в индексе по внешнему id
export function toHealthConnectExternalId(recordId: string): string {
  return "hc:" + recordId;
}

export function mapHealthConnectGlucose(
  records: readonly HealthConnectGlucoseRecordInput[],
  unit: GlucoseUnit
): HealthGlucoseSample[] {
  const result: HealthGlucoseSample[] = [];
  for (const record of records) {
    if (record.id === undefined || record.id === "") continue;
    const recordedAt = Date.parse(record.time);
    if (Number.isNaN(recordedAt)) continue;
    result.push({
      value: roundGlucose(
        unit === "mmol/L" ? record.mmolPerL : record.mgPerDl,
        unit
      ),
      unit,
      recordedAt,
      externalId: toHealthConnectExternalId(record.id),
    });
  }
  return result;
}

export function filterValidGlucose(
  samples: readonly HealthGlucoseSample[]
): HealthGlucoseSample[] {
  return samples.filter(
    (s) =>
      isGlucoseValueValid(s.value, s.unit) &&
      Number.isFinite(s.recordedAt) &&
      s.recordedAt > 0
  );
}

export function dedupeByExternalId(
  samples: readonly HealthGlucoseSample[]
): HealthGlucoseSample[] {
  const seen = new Set<string>();
  const result: HealthGlucoseSample[] = [];
  for (const s of samples) {
    if (seen.has(s.externalId)) continue;
    seen.add(s.externalId);
    result.push(s);
  }
  return result;
}

export function prepareGlucoseBatches(
  samples: readonly HealthGlucoseSample[],
  batchSize: number = GLUCOSE_BATCH_SIZE
): HealthGlucoseSample[][] {
  return chunk(dedupeByExternalId(filterValidGlucose(samples)), batchSize);
}
