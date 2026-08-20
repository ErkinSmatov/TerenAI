import Button from "@/components/ui/Button";
import {
  isOnboardingDataComplete,
  useOnboardingContext,
} from "@/context/OnboardingContext";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import OTPInput, { OTPInputHandle } from "@/components/ui/OTPInput";
import SafeArea, { useSafeArea } from "@/components/ui/SafeArea";
import Text from "@/components/ui/Text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import createAccurateInterval from "@/lib/utils/createAccurateInterval";
import getColor from "@/lib/ui/getColor";
import tryCatch from "@/lib/utils/tryCatch";
import { useAuthContext } from "@/context/AuthContext";
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
import { Toast } from "@/components/ui/Toast";

const channelNames: Record<string, string> = {
  "whatsapp-otp": "WhatsApp",
  "telegram-otp": "Telegram",
};

const resendErrorText = "Не удалось отправить код. Попробуйте ещё раз";

export default function ConfirmPhoneScreen() {
  const router = useRouter();
  const { signIn, isAuthenticated } = useAuthContext();
  const { phone, provider } = useLocalSearchParams<{
    phone: string;
    provider: string;
  }>();
  const insets = useSafeArea();
  const { data, targets } = useOnboardingContext();
  const completeOnboarding = useMutation(
    api.profiles.completeOnboarding.default
  );

  const inputRef = useRef<OTPInputHandle>(null);
  const [resendIn, setResendIn] = useState(0);
  const resendTimerRef = useRef<ReturnType<
    typeof createAccurateInterval
  > | null>(null);
  // Ждём, пока signIn(code) реально сменит isAuthenticated, прежде чем звать
  // authenticated-мутацию: сразу после resolve signIn() Convex-клиент ещё не
  // успевает применить токен к соединению, и completeOnboarding падает с
  // Unauthorized (гонка). В остальных флоу (Google/гость) между signIn и
  // completeOnboarding естественно проходит несколько рендеров — здесь этого
  // нет, поэтому ждём isAuthenticated явно.
  const [isSignedIn, setIsSignedIn] = useState(false);
  const hasStartedCompletionRef = useRef(false);

  const channelName = channelNames[provider] ?? "мессенджер";

  const handleSubmit = async (code: string) => {
    if (code.length !== 4) {
      inputRef.current?.flashError();
      return;
    }

    if (!phone || !provider) {
      inputRef.current?.flashError();
      return;
    }

    const { error } = await tryCatch(signIn(provider, { phone, code }));
    if (error) {
      inputRef.current?.flashError();
      return;
    }
    setIsSignedIn(true);
  };

  useEffect(() => {
    if (!isSignedIn || !isAuthenticated || hasStartedCompletionRef.current) {
      return;
    }
    hasStartedCompletionRef.current = true;

    (async () => {
      if (isOnboardingDataComplete(data)) {
        await completeOnboarding({ data, targets });
      }
      if (router.canDismiss()) router.dismissAll();
      router.replace("/app");
    })();
  }, [isSignedIn, isAuthenticated, data, targets, completeOnboarding, router]);

  const startResendCountdown = () => {
    if (resendIn > 0) return;

    resendTimerRef.current?.stop();

    setResendIn(59);
    const timer = createAccurateInterval(() => {
      setResendIn((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          timer.stop();
          resendTimerRef.current = null;
        }
        return next;
      });
    }, 1000);

    resendTimerRef.current = timer;
    timer.start();
  };

  const handleResend = async () => {
    if (!phone || !provider || resendIn > 0) return;
    const { error } = await tryCatch(signIn(provider, { phone }));
    if (!error) {
      startResendCountdown();
    } else {
      Toast.show({ text: resendErrorText, variant: "error" });
    }
  };

  useEffect(() => {
    return () => {
      resendTimerRef.current?.stop();
    };
  }, []);

  return (
    <ScreenMain edges={[]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={-insets.bottom + 16}
      >
        <ScreenHeader>
          <ScreenHeaderBackButton />
          <ScreenHeaderTitle title="Вход" />
        </ScreenHeader>

        <SafeArea edges={["left", "right"]}>
          <ScreenMainTitle
            title="Подтвердите номер"
            description={`Введите код, который мы только что отправили в ${channelName} на ${phone}`}
          />

          <OTPInput
            ref={inputRef}
            onFilled={(code) => void handleSubmit(code)}
            autoFocus
          />

          <View style={styles.footerText}>
            <Text size="14" color={getColor("mutedForeground")}>
              Не получили код?
            </Text>
            <Button
              size="sm"
              variant="text"
              disabled={resendIn > 0}
              onPress={() => void handleResend()}
              hitSlop={16}
              textProps={{
                style: {
                  color: resendIn > 0 ? getColor("mutedForeground") : undefined,
                  borderBottomColor:
                    resendIn > 0 ? getColor("mutedForeground") : undefined,
                },
              }}
            >
              {resendIn > 0 ? `Отправить снова (${resendIn})` : "Отправить снова"}
            </Button>
          </View>
        </SafeArea>

        <ScreenFooter style={{ boxShadow: [] }}>
          <ScreenFooterButton onPress={() => inputRef.current?.flashError()}>
            Продолжить
          </ScreenFooterButton>
        </ScreenFooter>
      </KeyboardAvoidingView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    gap: 32,
  },
  footerText: {
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
