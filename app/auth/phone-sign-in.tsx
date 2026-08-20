import SafeArea, { useSafeArea } from "@/components/ui/SafeArea";
import TextInput, { TextInputHandle } from "@/components/ui/TextInput";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useRef, useState } from "react";
import { z } from "zod";
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
import tryCatch from "@/lib/utils/tryCatch";
import { Toast } from "@/components/ui/Toast";

type PhoneOtpProvider = "whatsapp-otp" | "telegram-otp";

const sendCodeErrorText = "Не удалось отправить код. Попробуйте ещё раз";

export default function PhoneSignInScreen() {
  const { signIn } = useAuthContext();
  const insets = useSafeArea();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [isSending, setIsSending] = useState(false);

  const inputRef = useRef<TextInputHandle>(null);

  const PhoneForm = z.object({
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  });

  const handleSubmit = async (provider: PhoneOtpProvider) => {
    if (isSending) return;

    const result = PhoneForm.safeParse({ phone });
    if (!result.success) {
      inputRef.current?.flashError();
      return;
    }

    setIsSending(true);
    const { error } = await tryCatch(signIn(provider, { phone }));
    setIsSending(false);

    if (error) {
      Toast.show({ text: sendCodeErrorText, variant: "error" });
      return;
    }

    router.push({
      pathname: "/auth/confirm-phone",
      params: { phone, provider },
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
          <ScreenHeaderTitle title="Вход" />
        </ScreenHeader>

        <SafeArea edges={["left", "right"]}>
          <ScreenMainTitle
            title="Вход по номеру телефона"
            description="Мы отправим код подтверждения в WhatsApp или Telegram"
          />
          <TextInput
            label="Номер телефона"
            placeholder="+7 999 123 45 67"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
            ref={inputRef}
            autoFocus
          />
        </SafeArea>

        <ScreenFooter style={{ boxShadow: [] }}>
          <ScreenFooterButton
            disabled={isSending}
            onPress={() => void handleSubmit("whatsapp-otp")}
          >
            WhatsApp
          </ScreenFooterButton>
          <ScreenFooterButton
            variant="outline"
            disabled={isSending}
            onPress={() => void handleSubmit("telegram-otp")}
          >
            Telegram
          </ScreenFooterButton>
        </ScreenFooter>
      </KeyboardAvoidingView>
    </ScreenMain>
  );
}
