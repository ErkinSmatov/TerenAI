import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRateLimit } from "@convex-dev/rate-limiter/react";
import { ScreenMain, ScreenMainTitle } from "@/components/ui/screen/ScreenMain";
import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenFooter,
  ScreenFooterButton,
} from "@/components/ui/screen/ScreenFooter";
import TextInput from "@/components/ui/TextInput";
import { Toast } from "@/components/ui/Toast";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import SafeArea, { useSafeArea } from "@/components/ui/SafeArea";
import { analyzeMealConfig } from "@/convex/meals/analyze/analyzeMealConfig";
import tryCatch from "@/lib/utils/tryCatch";

export default function FixMealScreen() {
  const { mealId } = useLocalSearchParams<{ mealId: Id<"meals"> }>();
  const router = useRouter();
  const insets = useSafeArea();
  const correctMeal = useAction(api.meals.analyze.correctMeal.correctMeal);
  const [correction, setCorrection] = useState("");
  const [isCorrecting, setIsCorrecting] = useState(false);
  const { status } = useRateLimit(api.rateLimit.getAiFeaturesRateLimit, {
    getServerTimeMutation: api.rateLimit.getServerTime,
  });

  const handleCorrect = async () => {
    if (!mealId || !correction.trim() || isCorrecting) return;

    if (status && !status.ok) {
      Toast.show({
        text: "Вы достигли дневного лимита функций ИИ.",
        variant: "error",
      });
      return;
    }

    setIsCorrecting(true);
    const { error } = await tryCatch(correctMeal({ mealId, correction }));
    setIsCorrecting(false);

    if (error) {
      Toast.show({ text: "Ошибка при исправлении блюда", variant: "error" });
      return;
    }

    router.dismiss();
  };

  return (
    <ScreenMain edges={[]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={-insets.bottom + 16}
      >
        <ScreenHeader>
          <ScreenHeaderBackButton />
          <ScreenHeaderTitle title="Исправить блюдо" />
        </ScreenHeader>

        <SafeArea edges={["left", "right"]}>
          <ScreenMainTitle
            title="Что нужно исправить?"
            description="Опишите изменения, чтобы скорректировать блюдо"
          />
          <TextInput
            placeholder="Например: Это не курица, а тофу"
            value={correction}
            onChangeText={setCorrection}
            multiline
            autoFocus
            maxLength={analyzeMealConfig.maxUserInputLength}
          />
        </SafeArea>

        <ScreenFooter style={{ boxShadow: [] }}>
          <ScreenFooterButton
            onPress={() => void handleCorrect()}
            disabled={
              !correction.trim() ||
              (status !== undefined && !status.ok) ||
              isCorrecting
            }
          >
            {status !== undefined && !status.ok
              ? "Лимит исчерпан"
              : isCorrecting
                ? "Исправляем…"
                : "Исправить"}
          </ScreenFooterButton>
        </ScreenFooter>
      </KeyboardAvoidingView>
    </ScreenMain>
  );
}
