import { defineTable } from "convex/server";
import { v } from "convex/values";

// Литералы совпадают с LinkStatus в lib/observers/linkStatus.ts.
export const observerLinkStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("declined"),
  v.literal("revoked"),
  v.literal("expired"),
);

// Статус опционален только на шаге 1 до миграции backfillObserverLinkStatus
// (D-13); план 11 делает его обязательным. Строки не удаляются при отзыве:
// статусы хранятся для аудита и защиты от спама (D-09). endedBy различает
// отзыв пациентом и отмену/отзыв наблюдателем.
export const observerLinksFields = {
  observerId: v.id("users"),
  patientId: v.id("users"),
  status: v.optional(observerLinkStatusValidator),
  requestedAt: v.optional(v.number()),
  confirmedAt: v.optional(v.number()),
  respondedAt: v.optional(v.number()),
  endedBy: v.optional(v.union(v.literal("patient"), v.literal("observer"))),
  lastNotifiedAt: v.optional(v.number()),
};

export const observerLinks = defineTable(observerLinksFields)
  .index("byObserverId", ["observerId"])
  .index("byPatientId", ["patientId"])
  .index("byObserverAndPatient", ["observerId", "patientId"])
  .index("byStatusAndRequestedAt", ["status", "requestedAt"]);
