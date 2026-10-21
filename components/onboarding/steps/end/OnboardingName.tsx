import { ActivityIndicator, StyleSheet, View } from "react-native";
import OnboardingStep from "../../OnboardingStep";
import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";
import TextInput from "@/components/ui/TextInput";
import { useOnboardingContext } from "@/context/OnboardingContext";

export default function OnboardingName() {
  const { hasUserName, nameDraft, setNameDraft, setIsNameStepSkipped } =
    useOnboardingContext();

  // Пропуск: skip шага становится true, и Onboarding сам идёт дальше.
  const handleSkip = () => {
    setNameDraft("");
    setIsNameStepSkipped(true);
  };

  return (
    <OnboardingStep title="Как вас зовут?">
      <View style={styles.container}>
        <Text size="14" color="mutedForeground">
          Имя будет видно в Профиле. Его можно изменить позже
        </Text>
        {hasUserName === undefined ? (
          <ActivityIndicator />
        ) : (
          <TextInput
            placeholder="Имя"
            value={nameDraft}
            onChangeText={setNameDraft}
            maxLength={100}
            autoFocus
            autoCapitalize="words"
            textContentType="givenName"
          />
        )}
        <Button
          size="lg"
          variant="text"
          onPress={handleSkip}
          textProps={{ size: "16", weight: "500" }}
        >
          Пропустить
        </Button>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
});
