import { defineTable } from "convex/server";
import { v } from "convex/values";

export const observerLinksFields = {
  observerId: v.id("users"),
  patientId: v.id("users"),
};

export const observerLinks = defineTable(observerLinksFields)
  .index("byObserverId", ["observerId"])
  .index("byPatientId", ["patientId"])
  .index("byObserverAndPatient", ["observerId", "patientId"]);
