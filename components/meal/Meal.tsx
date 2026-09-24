import {
  ScreenHeader,
  ScreenHeaderActions,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "../ui/screen/ScreenHeader";
import {
  RefreshCwIcon,
  SparklesIcon,
  TrashIcon,
  TriangleAlertIcon,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ScreenFooter,
  ScreenFooterButton,
  ScreenFooterButtonIcon,
  ScreenFooterButtonText,
} from "../ui/screen/ScreenFooter";
import getColor from "@/lib/ui/getColor";
import {
  ScreenMain,
  ScreenMainScrollView,
  ScreenMainTitle,
} from "../ui/screen/ScreenMain";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRateLimit } from "@convex-dev/rate-limiter/react";
import { isRateLimitError } from "@convex-dev/rate-limiter";
import { Toast } from "../ui/Toast";
import Text from "../ui/Text";
import MealItems from "./MealItems";
import SafeArea from "../ui/SafeArea";
import MealCalorieOverview from "./MealCalorieOverview";
import MealNutrientTiles from "./MealNutrientTiles";
import { MacrosType, MicrosType } from "@/convex/tables/mealItems";
import ProLabel from "../ProLabel";
import { useSubscriptionContext } from "@/context/SubscriptionContext";
import tryCatch from "@/lib/utils/tryCatch";

type Props = {
  loading: boolean;
  name?: string;
  mealId?: Id<"meals">;
  status?: "pending" | "processing" | "done" | "error" | "deleted";
  totalMacros?: MacrosType;
  totalMicros?: MicrosType;
  mealItems?: React.ComponentProps<typeof MealItems>["items"];
};

export default function Meal({
  loading,
  name,
  mealId,
  status,
  totalMacros,
  totalMicros,
  mealItems,
}: Props) {
  const router = useRouter();
  const updateMeal = useMutation(api.meals.updateMeal.default);
  const retryProcessDetectedItems = useMutation(
    api.meals.retryProcessDetectedItems.default
  );
  const isDeletingRef = useRef(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { hasProAccess, navigateToPaywall } = useSubscriptionContext();

  const { scrollY, onScroll } = useScrollY();

  const { status: aiRateLimitStatus } = useRateLimit(
    api.rateLimit.getAiFeaturesRateLimit,
    { getServerTimeMutation: api.rateLimit.getServerTime }
  );

  const handleDelete = () => {
    if (!mealId || isDeletingRef.current) return;
    isDeletingRef.current = true;
    void updateMeal({ id: mealId, meal: { status: "deleted" } });
  };

  const handleRetry = async () => {
    if (!mealId || isRetrying) return;
    setIsRetrying(true);
    const { error } = await tryCatch(retryProcessDetectedItems({ mealId }));
    setIsRetrying(false);

    if (error) {
      if (isRateLimitError(error)) {
        Toast.show({
          text: "Слишком много попыток. Попробуйте позже.",
          variant: "error",
        });
      } else {
        Toast.show({
          text: "Ошибка при исправлении блюда",
          variant: "error",
        });
      }
      return;
    }
  };

  const handleFixMeal = () => {
    if (!hasProAccess) {
      navigateToPaywall();
      return;
    }

    if (aiRateLimitStatus && !aiRateLimitStatus.ok) {
      Toast.show({
        text: "Вы достигли дневного лимита функций ИИ.",
        variant: "error",
      });
      return;
    }

    router.push({ pathname: "/app/(meal)/fix-meal", params: { mealId } });
  };

  const isError = status === "error";

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Блюдо" />
        <ScreenHeaderActions
          options={[
            {
              Icon: TrashIcon,
              text: "Удалить",
              onPress: handleDelete,
              destructive: true,
            },
          ]}
        />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: [] }}
      >
        {!isError && (
          <SafeArea edges={["left", "right"]} style={{ flex: 0 }}>
            <ScreenMainTitle title={name} loading={loading} />
          </SafeArea>
        )}
        {isError ? (
          <SafeArea edges={["left", "right"]} style={styles.errorContainer}>
            <TriangleAlertIcon size={48} color={getColor("red")} />
            <View style={styles.errorTextContainer}>
              <Text size="18" weight="600">
                Не удалось распознать блюдо
              </Text>
              <Text size="14" color={getColor("mutedForeground")}>
                Что-то пошло не так при обработке. Попробуйте ещё раз.
              </Text>
            </View>
          </SafeArea>
        ) : (
          <>
            <View style={styles.summaryStack}>
              <MealCalorieOverview macros={totalMacros} loading={loading} />
              <MealNutrientTiles
                source="meal"
                id={mealId}
                micros={totalMicros}
                loading={loading}
              />
            </View>
            <SafeArea edges={["left", "right"]} style={{ flex: 0 }}>
              <MealItems loading={loading} items={mealItems} />
            </SafeArea>
          </>
        )}
      </ScreenMainScrollView>

      <ScreenFooter>
        {isError ? (
          <ScreenFooterButton
            onPress={() => void handleRetry()}
            disabled={isRetrying}
          >
            <ScreenFooterButtonIcon
              Icon={RefreshCwIcon}
              color={getColor("background")}
            />
            <ScreenFooterButtonText
              text={isRetrying ? "Повторяем…" : "Повторить"}
            />
          </ScreenFooterButton>
        ) : (
          <>
            <ScreenFooterButton
              variant="outline"
              onPress={handleFixMeal}
              disabled={
                loading ||
                (aiRateLimitStatus !== undefined && !aiRateLimitStatus.ok)
              }
              style={{ position: "relative" }}
            >
              {!hasProAccess && <ProLabel />}
              <ScreenFooterButtonIcon
                Icon={SparklesIcon}
                fill={getColor("foreground")}
              />
              <ScreenFooterButtonText text="Исправить" />
            </ScreenFooterButton>
            <ScreenFooterButton
              onPress={() => {
                router.dismissTo("/app");
              }}
            >
              Готово
            </ScreenFooterButton>
          </>
        )}
      </ScreenFooter>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 0,
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 32,
  },
  errorTextContainer: {
    alignItems: "center",
    marginTop: 24,
    gap: 8,
  },
  summaryStack: {
    gap: 18,
    paddingBottom: 32,
  },
});
