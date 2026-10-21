import {
  ScreenHeader,
  ScreenHeaderBackButton,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
} from "@/components/ui/screen/ScreenMain";
import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";
import TextInput from "@/components/ui/TextInput";
import Title from "@/components/ui/Title";
import { Toast } from "@/components/ui/Toast";
import { api } from "@/convex/_generated/api";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import tryCatch from "@/lib/utils/tryCatch";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

// Тот же экран, что и шаг «Как вас зовут?» в онбординге
// (OnboardingName), только с сохранением по кнопке.
export default function EditNameScreen() {
  const { scrollY, onScroll } = useScrollY();
  const router = useRouter();

  const rawName = useQuery(api.home.getCurrentUserRawName.default);
  const updateUserName = useMutation(api.users.updateUserName.default);

  // null — пользователь ещё не печатал, показываем текущее имя.
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const value = draft ?? rawName ?? "";
  const isValid = value.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || isSaving) return;
    setIsSaving(true);
    const { error } = await tryCatch(updateUserName({ name: value.trim() }));
    setIsSaving(false);

    if (error) {
      Toast.show({ text: "Не удалось сохранить имя", variant: "error" });
      return;
    }
    router.back();
  };

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll, keyboardShouldPersistTaps: "handled" }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <View style={styles.container}>
          <Title size="24">Как вас зовут?</Title>
          <Text size="14" color="mutedForeground">
            Имя будет видно в Профиле. Его можно изменить позже
          </Text>
          <TextInput
            placeholder="Имя"
            value={value}
            onChangeText={setDraft}
            maxLength={100}
            autoFocus
            autoCapitalize="words"
            textContentType="givenName"
          />
          <Button
            size="lg"
            disabled={!isValid || isSaving}
            onPress={() => void handleSave()}
          >
            {isSaving ? "Сохраняем…" : "Сохранить"}
          </Button>
        </View>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingTop: 8,
  },
});
