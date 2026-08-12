import { Doc } from "@/convex/_generated/dataModel";

export type GlucoseUnit = Doc<"glucoseReadings">["unit"];
export type GlucoseContext = NonNullable<Doc<"glucoseReadings">["context"]>;

export const glucoseUnits: GlucoseUnit[] = ["mmol/L", "mg/dL"];

export const glucoseContextLabels: Record<GlucoseContext, string> = {
  fasting: "Натощак",
  beforeMeal: "До еды",
  afterMeal: "После еды",
  random: "Произвольно",
};

export const glucoseContextOptions: { name: GlucoseContext; label: string }[] =
  (Object.keys(glucoseContextLabels) as GlucoseContext[]).map((name) => ({
    name,
    label: glucoseContextLabels[name],
  }));
