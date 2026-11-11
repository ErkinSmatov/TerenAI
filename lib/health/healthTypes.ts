// Общие типы здоровья. Только типы, без импортов из react-native/expo/convex:
// модуль загружается и в verify-скриптах через ts-node.
import type { HealthGlucoseUnit } from "./healthRanges";

export type GlucoseUnit = HealthGlucoseUnit;

export type MovementDay = {
  date: string;
  steps: number;
  activeEnergyKcal: number;
  distanceMeters: number;
};

// externalId: UUID HealthKit или "hc:" + metadata.id из Health Connect
export type HealthGlucoseSample = {
  value: number;
  unit: GlucoseUnit;
  recordedAt: number;
  externalId: string;
};

export type HealthSource = "healthkit" | "healthconnect";

export type HealthAvailability =
  | "available"
  | "needsInstall"
  | "needsUpdate"
  | "unsupported";

export type HealthConnectResult =
  | "granted"
  | "denied"
  | "needsInstall"
  | "needsUpdate"
  | "unsupported";

// startTime — LocalDateTime.toString() из Health Connect, напр. "2026-11-10T00:00"
export type AggregatePoint = {
  startTime: string;
  value: number;
};

export type HealthConnectGlucoseRecordInput = {
  id: string | undefined;
  time: string;
  mmolPerL: number;
  mgPerDl: number;
};
