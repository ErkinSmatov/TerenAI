import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useMutation } from "convex/react";
import ShareCodeCard from "@/components/observer/ShareCodeCard";
import OTPInput, { OTPInputHandle } from "@/components/ui/OTPInput";
import SafeArea from "@/components/ui/SafeArea";
import Text from "@/components/ui/Text";
import Title from "@/components/ui/Title";
import { Toast } from "@/components/ui/Toast";
import { useThemeContext } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

const TAB_OBSERVED = "Наблюдаемые";

export default function MapsScreen() {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  const redeemCode = useMutation(api.observers.redeemCode.default);

  const inputRef = useRef<OTPInputHandle>(null);
  const [, setActiveTab] = useState<string>(TAB_OBSERVED);

  const handleFilled = async (code: string) => {
    try {
      await redeemCode({ code });
      inputRef.current?.clear();
      setActiveTab(TAB_OBSERVED);
    } catch (error) {
      inputRef.current?.flashError();
      inputRef.current?.clear();
      const message = error instanceof Error ? error.message : "";

      if (message.includes("Code not found")) {
        Toast.show({
          text: "Код не найден. Проверьте и попробуйте снова.",
          variant: "error",
        });
      } else if (message.includes("Cannot observe yourself")) {
        Toast.show({
          text: "Это ваш код — наблюдать за собой нельзя.",
          variant: "error",
        });
      } else {
        Toast.show({
          text: "Не удалось подключиться. Попробуйте ещё раз.",
          variant: "error",
        });
      }
    }
  };

  return (
    <SafeArea edges={["top", "left", "right"]}>
      <Title style={styles.title}>Карты</Title>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <ShareCodeCard />
        <View style={styles.codeEntry}>
          <Text size="14" color={getColor("mutedForeground", undefined, theme)}>
            Введите код, чтобы наблюдать
          </Text>
          <OTPInput
            ref={inputRef}
            length={5}
            onFilled={(code) => void handleFilled(code)}
          />
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const createStyles = (_theme: ThemeName) =>
  ({
    title: {
      paddingBottom: 16,
    },
    content: {
      flexGrow: 1,
      gap: 16,
      paddingBottom: 24,
    },
    codeEntry: {
      gap: 8,
    },
  }) as const;
