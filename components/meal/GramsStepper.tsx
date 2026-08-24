import { useState } from "react";
import { StyleSheet, TextInput as RNTextInput, View } from "react-native";
import { MinusIcon, PlusIcon } from "lucide-react-native";
import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";
import getColor from "@/lib/ui/getColor";

type Props = {
  value: number;
  onChange: (grams: number) => void;
};

const MIN_GRAMS = 1;
const MAX_GRAMS = 1500;
const STEP = 10;

export default function GramsStepper({ value, onChange }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(Math.round(value)));

  const handleDecrement = () => {
    onChange(Math.max(MIN_GRAMS, value - STEP));
  };

  const handleIncrement = () => {
    onChange(Math.min(MAX_GRAMS, value + STEP));
  };

  const startEditing = () => {
    setDraft(String(Math.round(value)));
    setIsEditing(true);
  };

  const commitEdit = () => {
    const parsed = parseInt(draft, 10);
    const clamped = Math.max(MIN_GRAMS, Math.min(MAX_GRAMS, parsed || MIN_GRAMS));
    onChange(clamped);
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <Button
        variant="base"
        size="base"
        style={styles.stepperButton}
        hitSlop={8}
        onPress={handleDecrement}
      >
        <MinusIcon size={16} color={getColor("foreground")} />
      </Button>

      {isEditing ? (
        <RNTextInput
          style={styles.input}
          keyboardType="number-pad"
          autoFocus
          value={draft}
          onChangeText={setDraft}
          onBlur={commitEdit}
          onSubmitEditing={commitEdit}
        />
      ) : (
        <Button
          variant="base"
          size="base"
          style={styles.valueButton}
          onPress={startEditing}
        >
          <Text size="16" weight="600">
            {Math.round(value)} г
          </Text>
        </Button>
      )}

      <Button
        variant="base"
        size="base"
        style={styles.stepperButton}
        hitSlop={8}
        onPress={handleIncrement}
      >
        <PlusIcon size={16} color={getColor("foreground")} />
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepperButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  valueButton: {
    minWidth: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    minWidth: 44,
    height: 44,
    fontSize: 16,
    fontWeight: "600",
    color: getColor("foreground"),
    textAlign: "center",
  },
});
