import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { isGlucoseValueValid } from "@/lib/health/healthRanges";

export const MAX_IMPORT_BATCH = 500;
export const MAX_EXTERNAL_ID_LENGTH = 200;

const MAX_FUTURE_MS = 86400000;

export type ImportedGlucoseReading = {
  value: number;
  unit: "mmol/L" | "mg/dL";
  recordedAt: number;
  externalId: string;
};

// Общая вставка импортированных показаний: невалидные и дубли пропускаются, пачка не падает
export async function insertImportedGlucoseReadings(
  ctx: MutationCtx,
  userId: Id<"users">,
  source: "healthkit" | "healthconnect",
  readings: readonly ImportedGlucoseReading[]
): Promise<number> {
  const seen = new Set<string>();
  const maxRecordedAt = Date.now() + MAX_FUTURE_MS;
  let importedCount = 0;

  for (const reading of readings) {
    const { value, unit, recordedAt, externalId } = reading;

    if (externalId.length === 0 || externalId.length > MAX_EXTERNAL_ID_LENGTH) {
      continue;
    }
    if (!isGlucoseValueValid(value, unit)) continue;
    if (
      !Number.isFinite(recordedAt) ||
      recordedAt <= 0 ||
      recordedAt > maxRecordedAt
    ) {
      continue;
    }
    if (seen.has(externalId)) continue;
    seen.add(externalId);

    const existing = await ctx.db
      .query("glucoseReadings")
      .withIndex("byUserIdAndHealthKitUuid", (idx) =>
        idx.eq("userId", userId).eq("healthKitUuid", externalId)
      )
      .first();
    if (existing) continue;

    await ctx.db.insert("glucoseReadings", {
      userId,
      value,
      unit,
      recordedAt,
      source,
      healthKitUuid: externalId,
    });
    importedCount++;
  }

  return importedCount;
}
