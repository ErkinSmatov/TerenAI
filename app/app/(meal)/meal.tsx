import Meal from "@/components/meal/Meal";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import macrosToKcal from "@/lib/utils/macrosToKcal";
import { useAction, useQuery, useConvex, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import tryCatch from "@/lib/utils/tryCatch";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import logError from "@/lib/utils/logError";
import { getLocales } from "expo-localization";
import { fetchProduct } from "@/lib/off/fetchProduct";
import getFoodName from "@/lib/utils/getFoodName";
import { resolveAddDate } from "@/lib/utils/parseLocalDate";
import { getDefaultBarcodeEatenAt } from "@/lib/meals/mealSlots";

export default function MealScreen() {
  const router = useRouter();
  const convex = useConvex();
  const {
    mealId: initialMealId,
    barcode,
    date,
  } = useLocalSearchParams<{
    mealId?: Id<"meals">;
    barcode?: string;
    date?: string;
  }>();
  const addDate = useMemo(() => resolveAddDate(date, Date.now()), [date]);

  const analyzeMealBarcode = useAction(
    api.meals.analyze.analyzeMealBarcode.default
  );

  const [mealId, setMealId] = useState<Id<"meals"> | undefined>(initialMealId);
  const startedRef = useRef(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const addFavorite = useMutation(api.favorites.addFavoriteFromMeal.default);
  const removeFavorite = useMutation(api.favorites.removeFavorite.default);

  const data = useQuery(
    api.meals.getMeal.default,
    mealId ? { mealId } : "skip"
  );

  const createMealFromBarcode = useCallback(
    async (barcode: string, eatenAt?: number) => {
      const locale = getLocales().at(0)?.languageTag ?? "ru-RU";

      const existingFood = await convex.query(
        api.foods.getFoodByIdentity.default,
        {
          identity: { source: "off", id: barcode },
        }
      );

      if (existingFood) {
        return await analyzeMealBarcode({ barcode, eatenAt });
      }

      const product = await fetchProduct(barcode, locale);
      if (!product) {
        throw new Error("Product not found in Open Food Facts");
      }

      return await analyzeMealBarcode({ barcode, product, eatenAt });
    },
    [analyzeMealBarcode, convex]
  );

  const startMealAnalysis = useCallback(async () => {
    if (!barcode || initialMealId || startedRef.current || mealId) return;
    startedRef.current = true;

    try {
      const eatenAt =
        addDate && !addDate.isToday
          ? getDefaultBarcodeEatenAt(addDate.target, Date.now())
          : undefined;
      const mealId = await createMealFromBarcode(barcode, eatenAt);
      setMealId(mealId);
    } catch (e) {
      logError("Start meal error", e);
      Toast.show({ text: "Ошибка при анализе блюда", variant: "error" });
      router.replace("/app");
    }
  }, [createMealFromBarcode, initialMealId, mealId, barcode, router, addDate]);

  useEffect(() => {
    void startMealAnalysis();
  }, [startMealAnalysis]);

  const canFavoriteQuery =
    data?.meal.status === "done" && (data.meal.confirmedItems?.length ?? 0) > 0;
  const favoriteId = useQuery(
    api.favorites.getMealFavorite.default,
    canFavoriteQuery && mealId ? { mealId } : "skip"
  );

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

  const canFavorite = isDone && (meal.confirmedItems?.length ?? 0) > 0;

  const handleToggleFavorite = async () => {
    if (!mealId || favoritePending) return;
    setFavoritePending(true);
    const wasFavorite = !!favoriteId;
    const { error } = await tryCatch(
      favoriteId ? removeFavorite({ favoriteId }) : addFavorite({ mealId })
    );
    setFavoritePending(false);

    if (error) {
      if (
        error instanceof ConvexError &&
        (error.data as { code?: string } | undefined)?.code ===
          "FAVORITES_LIMIT"
      ) {
        Toast.show({
          text: "В избранном может быть не больше 50 блюд",
          variant: "error",
        });
      } else {
        logError("Toggle favorite error", error);
        Toast.show({
          text: "Не удалось обновить избранное",
          variant: "error",
        });
      }
      return;
    }
    Toast.show({
      text: wasFavorite ? "Удалено из избранного" : "Добавлено в избранное",
    });
  };

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
      isFavorite={!!favoriteId}
      onToggleFavorite={
        canFavorite ? () => void handleToggleFavorite() : undefined
      }
      favoritePending={favoritePending}
    />
  );
}
