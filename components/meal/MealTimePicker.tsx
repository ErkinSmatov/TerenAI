import { View } from "react-native";
import Card from "@/components/ui/Card";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Text from "@/components/ui/Text";
import WheelPicker from "@/components/ui/WheelPicker";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import {
  getSlotHour,
  MEAL_SLOT_IDS,
  MEAL_SLOT_LABELS,
  type MealSlotId,
} from "@/lib/meals/mealSlots";

type MealTimeValue = { slot: MealSlotId; hour: number; minute: number };

type Props = MealTimeValue & {
  dateLabel: string;
  onChange: (value: MealTimeValue) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);

export default function MealTimePicker({
  dateLabel,
  slot,
  hour,
  minute,
  onChange,
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  const slotIndex = MEAL_SLOT_IDS.indexOf(slot);
  const selectedLabel = MEAL_SLOT_LABELS[slotIndex];

  const handleSlotChange = (label: string) => {
    const nextSlot = MEAL_SLOT_IDS.at(MEAL_SLOT_LABELS.indexOf(label));
    if (!nextSlot) return;
    if (nextSlot === "other") {
      onChange({ slot: "other", hour, minute });
      return;
    }
    onChange({ slot: nextSlot, hour: getSlotHour(nextSlot), minute: 0 });
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text size="16" weight="600">
          Время приёма
        </Text>
        <Text size="14" color={getColor("mutedForeground", undefined, theme)}>
          {dateLabel}
        </Text>
      </View>

      <SegmentedControl
        options={MEAL_SLOT_LABELS}
        selectedOption={selectedLabel}
        onChange={handleSlotChange}
      />

      {slot === "other" ? (
        <View style={styles.pickers}>
          <WheelPicker
            data={HOURS}
            initialValue={String(hour).padStart(2, "0")}
            onValueChange={(value) => {
              onChange({ slot: "other", hour: Number(value), minute });
            }}
          />
          <WheelPicker
            data={MINUTES}
            initialValue={String(minute).padStart(2, "0")}
            onValueChange={(value) => {
              onChange({ slot: "other", hour, minute: Number(value) });
            }}
          />
        </View>
      ) : (
        <Text
          size="14"
          color={getColor("mutedForeground", undefined, theme)}
          style={styles.centerText}
        >
          {`в ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
        </Text>
      )}
    </Card>
  );
}

const createStyles = (_theme: ThemeName) => ({
  card: {
    gap: 12,
    marginBottom: 24,
  },
  header: {
    gap: 2,
  },
  pickers: {
    flexDirection: "row" as const,
  },
  centerText: {
    textAlign: "center" as const,
  },
});
