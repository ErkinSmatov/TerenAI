import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import { badges } from "./tables/badges";
import { bloodPressureReadings } from "./tables/bloodPressureReadings";
import { favoriteMeals } from "./tables/favoriteMeals";
import { foods } from "./tables/foods";
import { glucoseReadings } from "./tables/glucoseReadings";
import { meals } from "./tables/meals";
import { mealItems } from "./tables/mealItems";
import { movementData } from "./tables/movementData";
import { observerLinks } from "./tables/observerLinks";
import { profiles } from "./tables/profiles";
import { pushTokens } from "./tables/pushTokens";

export default defineSchema({
  ...authTables,
  badges,
  bloodPressureReadings,
  favoriteMeals,
  foods,
  glucoseReadings,
  meals,
  mealItems,
  movementData,
  observerLinks,
  profiles,
  pushTokens,
});
