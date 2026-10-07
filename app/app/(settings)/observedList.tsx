import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import { ScreenMain, ScreenMainScrollView } from "@/components/ui/screen/ScreenMain";
import Text from "@/components/ui/Text";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import OTPInput, { OTPInputHandle } from "@/components/ui/OTPInput";
import ObservedPatientCard from "@/components/observer/ObservedPatientCard";
import { StyleSheet, View } from "react-native";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";

export default function ObservedListScreen() {
  const patients = useQuery(api.observers.getObservedPatients.default, {
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
  });
  const redeemCode = useMutation(api.observers.redeemCode.default);
  const revokeLink = useMutation(api.observers.revokeLink.default);

  const [isEnteringCode, setIsEnteringCode] = useState(false);
  const inputRef = useRef<OTPInputHandle>(null);

  const handleFilled = async (code: string) => {
    try {
      await redeemCode({ code });
      setIsEnteringCode(false);
    } catch (error) {
      inputRef.current?.flashError();
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

  const handleRemove = async (linkId: Id<"observerLinks">) => {
    try {
      await revokeLink({ linkId });
    } catch {
      Toast.show({
        text: "Не удалось подключиться. Попробуйте ещё раз.",
        variant: "error",
      });
    }
  };

  const codeEntry = isEnteringCode ? (
    <View style={styles.codeEntry}>
      <OTPInput
        ref={inputRef}
        length={5}
        autoFocus
        onFilled={(code) => void handleFilled(code)}
      />
    </View>
  ) : (
    <Button
      variant="primary"
      size="base"
      style={styles.enterCodeButton}
      onPress={() => {
        setIsEnteringCode(true);
      }}
    >
      Ввести код
    </Button>
  );

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Кого я наблюдаю" />
      </ScreenHeader>

      <ScreenMainScrollView
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        {patients === undefined ? null : patients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text size="20" weight="600" style={styles.emptyTitle}>
              Вы пока никого не наблюдаете
            </Text>
            <Text
              size="16"
              color={getColor("mutedForeground")}
              style={styles.emptyBody}
            >
              Введите код, которым поделился пациент, чтобы увидеть его
              данные за сегодня.
            </Text>
            {codeEntry}
          </View>
        ) : (
          <View style={styles.list}>
            {patients.map((item) => (
              <ObservedPatientCard
                key={item.linkId}
                patient={item}
                onRemove={() => void handleRemove(item.linkId)}
              />
            ))}
            {codeEntry}
          </View>
        )}
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 16,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyBody: {
    textAlign: "center",
  },
  codeEntry: {
    alignSelf: "stretch",
  },
  enterCodeButton: {
    height: 48,
  },
});
