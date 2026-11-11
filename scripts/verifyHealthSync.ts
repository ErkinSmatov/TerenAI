import assert from "node:assert/strict";

import {
  DAY_MS,
  chunk,
  computeSince,
  dateKeyFromLocalDateTime,
  mapHealthConnectGlucose,
  mergeMovementAggregates,
  prepareGlucoseBatches,
  resolveGlucoseUnit,
  roundGlucose,
} from "../lib/health/healthMapping";
import type { HealthGlucoseSample, MovementDay } from "../lib/health/healthTypes";
import {
  syncHealthData,
  type HealthSyncDeps,
} from "../lib/health/syncHealthData";

const NOW = Date.parse("2026-11-12T12:00:00Z");

// chunk
assert.deepEqual(
  chunk(Array.from({ length: 450 }, (_, i) => i), 200).map((c) => c.length),
  [200, 200, 50]
);
assert.deepEqual(chunk([], 200), []);
assert.throws(() => chunk([1], 0));
assert.throws(() => chunk([1], 1.5));

// computeSince
const floor = NOW - 30 * DAY_MS;
assert.equal(computeSince(null, NOW), floor);
assert.equal(computeSince(NOW - 2 * DAY_MS, NOW), NOW - 3 * DAY_MS);
assert.equal(computeSince(NOW - 40 * DAY_MS, NOW), floor);
assert.equal(computeSince(NOW + DAY_MS, NOW), floor);
assert.equal(computeSince(NaN, NOW), floor);

// dateKeyFromLocalDateTime
assert.equal(dateKeyFromLocalDateTime("2026-11-10T00:00"), "2026-11-10");
assert.equal(dateKeyFromLocalDateTime("garbage"), null);

// mergeMovementAggregates
const merged = mergeMovementAggregates(
  [
    { startTime: "2026-11-11T00:00", value: 1000.6 },
    { startTime: "2026-11-10T00:00", value: 500 },
    { startTime: "bad", value: 9999 },
  ],
  [{ startTime: "2026-11-10T00:00", value: 120.4 }],
  [{ startTime: "2026-11-10T00:00", value: -50 }]
);
assert.deepEqual(merged, [
  { date: "2026-11-10", steps: 500, activeEnergyKcal: 120, distanceMeters: 0 },
  { date: "2026-11-11", steps: 1001, activeEnergyKcal: 0, distanceMeters: 0 },
]);

// roundGlucose / resolveGlucoseUnit
assert.equal(roundGlucose(5.56, "mmol/L"), 5.6);
assert.equal(roundGlucose(99.6, "mg/dL"), 100);
assert.equal(resolveGlucoseUnit(null), "mmol/L");
assert.equal(resolveGlucoseUnit(undefined), "mmol/L");
assert.equal(resolveGlucoseUnit("mg/dL"), "mg/dL");

// mapHealthConnectGlucose
const mapped = mapHealthConnectGlucose(
  [
    { id: undefined, time: "2026-11-10T08:00:00Z", mmolPerL: 5, mgPerDl: 90 },
    { id: "a", time: "nope", mmolPerL: 5, mgPerDl: 90 },
    { id: "b", time: "2026-11-10T08:00:00Z", mmolPerL: 5.5, mgPerDl: 99.6 },
  ],
  "mg/dL"
);
assert.equal(mapped.length, 1);
assert.ok(mapped[0].externalId.startsWith("hc:"));
assert.equal(mapped[0].value, 100);
assert.equal(mapped[0].unit, "mg/dL");

// prepareGlucoseBatches: диапазон и дубли
const mk = (id: string, value: number): HealthGlucoseSample => ({
  value,
  unit: "mmol/L",
  recordedAt: NOW,
  externalId: id,
});
const prepared = prepareGlucoseBatches([
  mk("1", 80),
  mk("2", 0.5),
  mk("3", 5.5),
  mk("3", 5.5),
]);
assert.equal(prepared.length, 1);
assert.deepEqual(prepared[0].map((s) => s.externalId), ["3"]);

type LogEntry = { stage: string; payload: Record<string, string | number> };

function makeDeps(overrides: Partial<HealthSyncDeps> = {}) {
  const calls = {
    batches: [] as HealthGlucoseSample[][],
    setLast: [] as number[],
    movement: [] as MovementDay[][],
    fetchSince: [] as Date[],
    logs: [] as LogEntry[],
  };
  const deps: HealthSyncDeps = {
    fetchRecentMovement: () => Promise.resolve([]),
    fetchGlucoseSamples: (since) => {
      calls.fetchSince.push(since);
      return Promise.resolve([]);
    },
    syncMovementDays: (days) => {
      calls.movement.push(days);
      return Promise.resolve();
    },
    importGlucoseBatch: (batch) => {
      calls.batches.push(batch);
      return Promise.resolve(batch.length);
    },
    getLastGlucoseSync: () => null,
    setLastGlucoseSync: (ms) => {
      calls.setLast.push(ms);
    },
    now: () => NOW,
    log: (stage, payload) => {
      calls.logs.push({ stage, payload });
    },
    ...overrides,
  };
  return { deps, calls };
}

async function main(): Promise<void> {
  // a) 8640 образцов CGM -> 44 последовательные пачки
  const samples: HealthGlucoseSample[] = Array.from({ length: 8640 }, (_, i) => ({
    value: 5 + (i % 10) / 10,
    unit: "mmol/L",
    recordedAt: NOW - i * 5 * 60 * 1000,
    externalId: `hc:${String(i)}`,
  }));
  let inFlight = false;
  const a = makeDeps({
    fetchGlucoseSamples: () => Promise.resolve(samples),
  });
  a.deps.importGlucoseBatch = async (batch) => {
    assert.equal(inFlight, false, "пачки должны идти последовательно");
    inFlight = true;
    a.calls.batches.push(batch);
    await Promise.resolve();
    inFlight = false;
    return batch.length;
  };
  const resA = await syncHealthData(a.deps, { movement: false, glucose: true });
  assert.equal(a.calls.batches.length, 44);
  assert.ok(a.calls.batches.every((b) => b.length <= 200));
  assert.equal(
    a.calls.batches.reduce((s, b) => s + b.length, 0),
    8640
  );
  assert.deepEqual(a.calls.setLast, [NOW]);
  assert.equal(resA.glucoseImported, 8640);

  // b) сбой на 2-й пачке -> lastSync не пишется
  let n = 0;
  const b = makeDeps({
    fetchGlucoseSamples: () => Promise.resolve(samples),
    importGlucoseBatch: (batch) => {
      n += 1;
      if (n === 2) return Promise.reject(new Error("fail"));
      return Promise.resolve(batch.length);
    },
  });
  await assert.rejects(
    syncHealthData(b.deps, { movement: false, glucose: true })
  );
  assert.equal(b.calls.setLast.length, 0);

  // c) инкрементальное окно
  const c = makeDeps({ getLastGlucoseSync: () => NOW - DAY_MS });
  await syncHealthData(c.deps, { movement: false, glucose: true });
  assert.equal(c.calls.fetchSince[0].getTime(), NOW - 2 * DAY_MS);

  // d) только движение
  const day: MovementDay = {
    date: "2026-11-11",
    steps: 100,
    activeEnergyKcal: 5,
    distanceMeters: 70,
  };
  const d = makeDeps({ fetchRecentMovement: () => Promise.resolve([day]) });
  await syncHealthData(d.deps, { movement: true, glucose: false });
  assert.equal(d.calls.movement.length, 1);
  assert.ok(d.calls.movement[0].length <= 8);
  assert.equal(d.calls.fetchSince.length, 0);
  const d2 = makeDeps();
  await syncHealthData(d2.deps, { movement: true, glucose: false });
  assert.equal(d2.calls.movement.length, 0);

  // e) в логах нет значений здоровья
  for (const { payload } of [...a.calls.logs, ...d.calls.logs]) {
    assert.ok(!("value" in payload) && !("steps" in payload));
  }

  console.log("verifyHealthSync: OK");
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
