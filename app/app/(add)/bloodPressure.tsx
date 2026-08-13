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
import { StyleSheet, View } from "react-native";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";

export default function BloodPressureScreen() {
  const insets = useSafeArea();
  const router = useRouter();
  const createReading = useMutation(api.bloodPressure.createReading.default);

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");

  const systolicValue = Number(systolic);
  const diastolicValue = Number(diastolic);
  const pulseValue = pulse.trim() === "" ? undefined : Number(pulse);
  const isValid =
    systolic.trim() !== "" &&
    diastolic.trim() !== "" &&
    systolicValue > 0 &&
    diastolicValue > 0 &&
    (pulseValue === undefined || pulseValue > 0);

  const handleSave = () => {
    if (!isValid) return;

    void createReading({
      systolic: systolicValue,
      diastolic: diastolicValue,
      pulse: pulseValue,
    });
    router.back();
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
          <ScreenHeaderTitle title="Давление" />
        </ScreenHeader>

        <SafeArea edges={["left", "right"]} style={styles.container}>
          <ScreenMainTitle
            title="Добавить показание"
            description="Введите значения с тонометра"
          />
          <View style={styles.row}>
            <TextInput
              label="Систолическое"
              placeholder="120"
              value={systolic}
              onChangeText={setSystolic}
              keyboardType="number-pad"
              autoFocus
              suffix="мм рт. ст."
              containerStyle={styles.rowInput}
            />
            <TextInput
              label="Диастолическое"
              placeholder="80"
              value={diastolic}
              onChangeText={setDiastolic}
              keyboardType="number-pad"
              suffix="мм рт. ст."
              containerStyle={styles.rowInput}
            />
          </View>
          <TextInput
            label="Пульс (необязательно)"
            placeholder="72"
            value={pulse}
            onChangeText={setPulse}
            keyboardType="number-pad"
            suffix="уд/мин"
          />
        </SafeArea>

        <ScreenFooter style={{ boxShadow: [] }}>
          <ScreenFooterButton onPress={handleSave} disabled={!isValid}>
            Сохранить
          </ScreenFooterButton>
        </ScreenFooter>
      </KeyboardAvoidingView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowInput: {
    flex: 1,
  },
});
