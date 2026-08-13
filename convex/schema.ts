import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { bloodPressureReadings } from "./tables/bloodPressureReadings";
import { foods } from "./tables/foods";
import { glucoseReadings } from "./tables/glucoseReadings";
import { meals } from "./tables/meals";
import { mealItems } from "./tables/mealItems";
import { movementData } from "./tables/movementData";
import { profiles } from "./tables/profiles";

export default defineSchema({
  ...authTables,
  bloodPressureReadings,
  foods,
  glucoseReadings,
  meals,
  mealItems,
  movementData,
  profiles,
});
