import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Toast } from "../ui/Toast";
import getLocalWeekBounds from "@/lib/utils/getLocalWeekBounds";

/**
 * Layout-level, screen-independent watcher for meal completion (MEAL-04).
 *
 * Renders nothing — exists purely for its useQuery + useEffect side effect.
 * Fires a completion/error toast exactly once per genuine "processing" ->
 * "done"/"error" transition, regardless of which screen (if any) is
 * currently mounted. Never fires for a meal it first observes as already
 * done/error (no spurious toast on reopening old meals, matching D-14).
 */
export default function MealCompletionWatcher() {
  const weekBounds = getLocalWeekBounds();
  const weekMeals = useQuery(api.meals.getWeekMeals.default, {
    dayStartsUtc: weekBounds.dayStartsUtc,
  });

  const prevStatusRef = useRef<Map<Id<"meals">, Doc<"meals">["status"]>>(
    new Map()
  );

  useEffect(() => {
    if (weekMeals === undefined) return;

    const meals = weekMeals.flat();
    const seenIds = new Set<Id<"meals">>();

    for (const meal of meals) {
      seenIds.add(meal._id);
      const previous = prevStatusRef.current.get(meal._id);

      if (previous === "processing" && meal.status === "done") {
        Toast.show({
          text: "Блюдо распознано и записано",
          variant: "success",
        });
      } else if (previous === "processing" && meal.status === "error") {
        Toast.show({
          text: "Не удалось распознать блюдо",
          variant: "error",
        });
      }

      prevStatusRef.current.set(meal._id, meal.status);
    }

    for (const id of prevStatusRef.current.keys()) {
      if (!seenIds.has(id)) {
        prevStatusRef.current.delete(id);
      }
    }
  }, [weekMeals]);

  return null;
}
