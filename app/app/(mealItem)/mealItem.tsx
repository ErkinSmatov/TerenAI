import MealItem from "@/components/mealItem/MealItem";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import getFoodName from "@/lib/utils/getFoodName";

export default function MealItemScreen() {
  const { mealItemId } = useLocalSearchParams<{
    mealItemId: Id<"mealItems">;
  }>();
  const mealItem = useQuery(
    api.mealItems.getMealItem.default,
    mealItemId ? { mealItemId } : "skip"
  );

  const isLoading = mealItem === undefined;

  return (
    <MealItem
      mealItemId={mealItemId}
      name={mealItem ? getFoodName(mealItem.food) : undefined}
      mealItem={mealItem ?? undefined}
      loading={isLoading}
    />
  );
}
