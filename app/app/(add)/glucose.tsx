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
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select, { SelectOption } from "@/components/ui/Select";
import Text from "@/components/ui/Text";
import { useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { StyleSheet, View } from "react-native";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { ClockIcon, MoonIcon, ShuffleIcon, UtensilsIcon } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { glucoseUnits, type GlucoseContext, type GlucoseUnit } from "@/config/glucoseConfig";

const contextOptions: SelectOption[] = [
  { name: "fasting", label: "Натощак", Icon: MoonIcon },
  { name: "beforeMeal", label: "До еды", Icon: UtensilsIcon },
  { name: "afterMeal", label: "После еды", Icon: ClockIcon },
  { name: "random", label: "Произвольно", Icon: ShuffleIcon },
];

export default function GlucoseScreen() {
  const insets = useSafeArea();
  const router = useRouter();
  const createReading = useMutation(api.glucose.createReading.default);

  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<GlucoseUnit>("mmol/L");
  const [context, setContext] = useState<GlucoseContext | undefined>(
    undefined
  );

  const numericValue = Number(value.replace(",", "."));
  const isValid = value.trim() !== "" && numericValue > 0;

  const handleSave = () => {
    if (!isValid) return;

    void createReading({ value: numericValue, unit, context });
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
          <ScreenHeaderTitle title="Уровень сахара" />
        </ScreenHeader>

        <SafeArea edges={["left", "right"]} style={styles.container}>
          <ScreenMainTitle
            title="Добавить показание"
            description="Введите значение, полученное с глюкометра"
          />
          <TextInput
            placeholder="0.0"
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            autoFocus
            suffix={unit}
          />

          <View style={styles.unitContainer}>
            <SegmentedControl
              options={glucoseUnits}
              selectedOption={unit}
              onChange={(option) => {
                setUnit(option as GlucoseUnit);
              }}
            />
          </View>

          <View style={styles.contextContainer}>
            <Text weight="600" style={styles.contextLabel}>
              Когда измеряли?
            </Text>
            <Select
              options={contextOptions}
              selectedOptions={context ? [context] : []}
              onSelectOption={(name) => {
                setContext(name as GlucoseContext);
              }}
            />
          </View>
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
    gap: 24,
  },
  unitContainer: {
    alignSelf: "center",
    width: "60%",
  },
  contextContainer: {
    gap: 12,
  },
  contextLabel: {
    paddingLeft: 4,
  },
});
