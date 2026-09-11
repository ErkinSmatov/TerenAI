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

// +7 XXX XXX XX XX — маска для казахстанских/российских номеров (10 цифр
// после кода страны), чтобы пользователю не приходилось печатать "+7" самому
// (69-08 Task 1, п.4).
const PHONE_PREFIX = "+7 ";
const MAX_DIGITS = 10;

function formatPhoneDigits(digits: string): string {
  const groups = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ].filter(Boolean);
  return PHONE_PREFIX + groups.join(" ");
}

function extractDigits(rawInput: string): string {
  let digitsOnly = rawInput.replace(/\D/g, "");
  // Пользователь мог напечатать "7" или "8" в начале по привычке — код
  // страны уже подставлен префиксом, повторно вводить его не нужно.
  if (digitsOnly.startsWith("7") || digitsOnly.startsWith("8")) {
    digitsOnly = digitsOnly.slice(1);
  }
  return digitsOnly.slice(0, MAX_DIGITS);
}

export default function PhoneSignInScreen() {
  const { signIn } = useAuthContext();
  const insets = useSafeArea();
  const router = useRouter();

  const [digits, setDigits] = useState("");
  const [isSending, setIsSending] = useState(false);

  const inputRef = useRef<TextInputHandle>(null);

  const phone = `+7${digits}`;

  const handleChangeText = (rawInput: string) => {
    setDigits(extractDigits(rawInput));
  };

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
            value={formatPhoneDigits(digits)}
            onChangeText={handleChangeText}
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
