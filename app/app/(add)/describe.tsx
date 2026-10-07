import SafeArea, { useSafeArea } from "@/components/ui/SafeArea";
import {
  ScreenFooter,
  ScreenFooterButton,
} from "@/components/ui/screen/ScreenFooter";
import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import { ScreenMain, ScreenMainTitle } from "@/components/ui/screen/ScreenMain";
import TextInput from "@/components/ui/TextInput";
import { useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { api } from "@/convex/_generated/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { resolveAddDate } from "@/lib/utils/parseLocalDate";
import { useRateLimit } from "@convex-dev/rate-limiter/react";
import { Toast } from "@/components/ui/Toast";
import { StyleSheet } from "react-native";
import { analyzeMealConfig } from "@/convex/meals/analyze/analyzeMealConfig";

export default function DescribeScreen() {
  const insets = useSafeArea();
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const addDate = resolveAddDate(date, Date.now());
  const { status } = useRateLimit(api.rateLimit.getAiFeaturesRateLimit, {
    getServerTimeMutation: api.rateLimit.getServerTime,
  });
  const [description, setDescription] = useState("");

  const handleAnalyze = () => {
    if (!description.trim()) return;

    if (status && !status.ok) {
      Toast.show({
        text: "Вы достигли дневного лимита функций ИИ.",
        variant: "error",
      });
      return;
    }

    router.replace({
      pathname: "/app/(meal)/confirm-meal",
      params: { description, ...(addDate ? { date: addDate.date } : {}) },
    });
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
          <ScreenHeaderTitle title="Описать блюдо" />
        </ScreenHeader>

        <SafeArea edges={["left", "right"]}>
          <ScreenMainTitle
            title="Что вы съели?"
            description="Опишите блюдо и его ингредиенты"
          />
          <TextInput
            placeholder="Например: Два тоста с авокадо и одно яйцо-глазунья"
            value={description}
            onChangeText={setDescription}
            multiline
            autoFocus
            style={styles.textInput}
            maxLength={analyzeMealConfig.maxUserInputLength}
          />
        </SafeArea>

        <ScreenFooter style={{ boxShadow: [] }}>
          <ScreenFooterButton
            onPress={handleAnalyze}
            disabled={
              !description.trim() || (status !== undefined && !status.ok)
            }
          >
            {status !== undefined && !status.ok
              ? "Лимит исчерпан"
              : "Анализировать блюдо"}
          </ScreenFooterButton>
        </ScreenFooter>
      </KeyboardAvoidingView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  textInput: {
    minHeight: 38,
    textAlignVertical: "top",
  },
});
