import { StyleSheet, View } from "react-native";
import OnboardingStep from "../../OnboardingStep";
import SignInButtons from "@/components/auth/SignInButtons";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { useAuthContext } from "@/context/AuthContext";
import {
  isOnboardingDataComplete,
  useOnboardingContext,
} from "@/context/OnboardingContext";
import { useState, useCallback } from "react";
import sleep from "@/lib/utils/sleep";
import tryCatch from "@/lib/utils/tryCatch";
import logError from "@/lib/utils/logError";

export default function OnboardingCreateAccount() {
  const { data } = useOnboardingContext();
  const { signIn } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContinuingAsGuest, setIsContinuingAsGuest] = useState(false);
  const isDataComplete = isOnboardingDataComplete(data);
  const isBusy = isSubmitting || isContinuingAsGuest;

  const handleOnboardingComplete = useCallback(async () => {
    if (isBusy || !isOnboardingDataComplete(data)) return;
    setIsSubmitting(true);
    try {
      await sleep(1000);
    } finally {
      setIsSubmitting(false);
    }
  }, [data, isBusy]);

  // Успешный вход переключает isAuthenticated, из-за чего шаг помечается
  // пропускаемым и Onboarding сам переходит к следующему — вручную
  // переключать шаг здесь не нужно.
  const handleContinueAsGuest = useCallback(async () => {
    if (isBusy || !isDataComplete) return;
    setIsContinuingAsGuest(true);

    const { error } = await tryCatch(signIn("anonymous"));
    if (error) {
      logError("Anonymous sign-in error", error);
      Toast.show({
        text: "Не удалось продолжить без аккаунта. Попробуйте ещё раз",
        variant: "error",
      });
      setIsContinuingAsGuest(false);
    }
  }, [isBusy, isDataComplete, signIn]);

  return (
    <OnboardingStep title="Создайте аккаунт">
      <View style={styles.container}>
        <View style={styles.signInButtonsContainer}>
          <SignInButtons
            disabled={!isDataComplete || isBusy}
            onSuccess={handleOnboardingComplete}
            shouldRedirect={false}
          />
          <Button
            size="lg"
            variant="text"
            style={styles.guestButton}
            onPress={() => void handleContinueAsGuest()}
            disabled={!isDataComplete || isBusy}
            textProps={{ size: "16", weight: "500" }}
          >
            Продолжить без аккаунта
          </Button>
        </View>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonsContainer: {
    width: "100%",
  },
  guestButton: {
    marginTop: 20,
  },
});
