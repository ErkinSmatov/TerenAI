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
import logError from "@/lib/utils/logError";
import { ConvexError } from "convex/values";
import {
  getOtpErrorMessage,
  isOtpErrorData,
  type PhoneOtpProvider,
} from "@/lib/auth/otpErrorMessage";
import { Toast } from "@/components/ui/Toast";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Text from "@/components/ui/Text";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  PhoneCountry,
  extractNationalDigits,
  formatNationalNumber,
  isCompleteNationalNumber,
  toE164,
} from "@/lib/auth/phoneCountries";
import testingConfig from "@/config/testingConfig";


export default function PhoneSignInScreen() {
  const { signIn } = useAuthContext();
  const insets = useSafeArea();
  const router = useRouter();

  const [country, setCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [digits, setDigits] = useState("");
  const [isSending, setIsSending] = useState(false);

  const inputRef = useRef<TextInputHandle>(null);
  const sheetRef = useRef<BottomSheetModal>(null);

  const phone = toE164(country, digits);

  const handleChangeText = (rawInput: string) => {
    setDigits(extractNationalDigits(country, rawInput));
  };

  const PhoneForm = z.object({
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  });

  const handleSubmit = async (provider: PhoneOtpProvider) => {
    if (isSending) return;

    if (!isCompleteNationalNumber(country, digits)) {
      inputRef.current?.flashError();
      return;
    }

    const result = PhoneForm.safeParse({ phone });
    if (!result.success) {
      inputRef.current?.flashError();
      return;
    }

    if (phone === testingConfig.reviewerPhone) {
      // Ревьюер App Store: код не отправляем, вход выполнит confirm-phone.
      router.push({
        pathname: "/auth/confirm-phone",
        params: { phone, provider: "phone-review" },
      });
      return;
    }

    setIsSending(true);
    const { error } = await tryCatch(signIn(provider, { phone }));
    setIsSending(false);

    if (error) {
      const data: unknown = error instanceof ConvexError ? error.data : undefined;
      if (!isOtpErrorData(data)) {
        logError("phone-sign-in send code error", error);
      }
      const { text } = getOtpErrorMessage(data, provider);
      Toast.show({ text, variant: "error" });
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
          <BottomSheet
            ref={sheetRef}
            Trigger={
              <Button variant="outline">
                {`${country.flag} ${country.name} +${country.dialCode}`}
              </Button>
            }
          >
            <BottomSheetScrollView style={{ maxHeight: 420 }}>
              <Select
                options={PHONE_COUNTRIES.map((c) => ({
                  name: c.iso,
                  label: c.name,
                  description: `+${c.dialCode}`,
                  Icon: <Text size="20">{c.flag}</Text>,
                }))}
                selectedOptions={[country.iso]}
                onSelectOption={(iso) => {
                  const next = PHONE_COUNTRIES.find((c) => c.iso === iso);
                  if (!next) return;
                  setCountry(next);
                  setDigits("");
                  sheetRef.current?.dismiss();
                }}
              />
            </BottomSheetScrollView>
          </BottomSheet>
          <TextInput
            containerStyle={{ marginTop: 16 }}
            label="Номер телефона"
            placeholder={formatNationalNumber(
              country,
              "0".repeat(country.nationalDigits),
            )}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={formatNationalNumber(country, digits)}
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
