import Meal from "@/components/meal/Meal";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import macrosToKcal from "@/lib/utils/macrosToKcal";
import { useAction, useQuery, useConvex } from "convex/react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import logError from "@/lib/utils/logError";
import { getLocales } from "expo-localization";
import { fetchProduct } from "@/lib/off/fetchProduct";
import getFoodName from "@/lib/utils/getFoodName";

export default function MealScreen() {
  const router = useRouter();
  const convex = useConvex();
  const {
    mealId: initialMealId,
    barcode,
  } = useLocalSearchParams<{
    mealId?: Id<"meals">;
    barcode?: string;
  }>();

  const analyzeMealBarcode = useAction(
    api.meals.analyze.analyzeMealBarcode.default
  );

  const [mealId, setMealId] = useState<Id<"meals"> | undefined>(initialMealId);
  const startedRef = useRef(false);

  const data = useQuery(
    api.meals.getMeal.default,
    mealId ? { mealId } : "skip"
  );

  const createMealFromBarcode = useCallback(
    async (barcode: string) => {
      const locale = getLocales().at(0)?.languageTag ?? "ru-RU";

      const existingFood = await convex.query(
        api.foods.getFoodByIdentity.default,
        {
          identity: { source: "off", id: barcode },
        }
      );

      if (existingFood) {
        return await analyzeMealBarcode({ barcode });
      }

      const product = await fetchProduct(barcode, locale);
      if (!product) {
        throw new Error("Product not found in Open Food Facts");
      }

      return await analyzeMealBarcode({ barcode, product });
    },
    [analyzeMealBarcode, convex]
  );

  const startMealAnalysis = useCallback(async () => {
    if (!barcode || initialMealId || startedRef.current || mealId) return;
    startedRef.current = true;

    try {
      const mealId = await createMealFromBarcode(barcode);
      setMealId(mealId);
    } catch (e) {
      logError("Start meal error", e);
      Toast.show({ text: "Ошибка при анализе блюда", variant: "error" });
      router.replace("/app");
    }
  }, [createMealFromBarcode, initialMealId, mealId, barcode, router]);

  useEffect(() => {
    void startMealAnalysis();
  }, [startMealAnalysis]);

  if (mealId && data === null) {
    return <Redirect href="/app" />;
  }

  const meal = data?.meal;
  const mealItems = data?.mealItems ?? [];

  const isDone =
    !!meal &&
    meal.status === "done" &&
    !!meal.name &&
    !!meal.totalMacros &&
    !!meal.totalNutrients;

  const items = isDone
    ? mealItems.map((item) => ({
        id: item._id,
        name: getFoodName(item.food),
        calories: macrosToKcal(item.macrosPer100g) * (item.grams / 100),
        grams: item.grams,
      }))
    : undefined;

  const isLoading = !mealId || !data || !isDone;

  return (
    <Meal
      loading={isLoading}
      name={meal?.name}
      mealId={meal?._id}
      status={meal?.status}
      totalMacros={meal?.totalMacros}
      totalMicros={meal?.totalMicros}
      mealItems={items}
    />
  );
}
