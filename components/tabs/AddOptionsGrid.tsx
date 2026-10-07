import { StyleSheet, View } from "react-native";
import Card from "../ui/Card";
import Text from "../ui/Text";
import Button from "../ui/Button";
import ProLabel from "../ProLabel";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import type { AddOption } from "./addMealOptions";

// Сетка в 2 колонки на всю ширину: внутренний padding контейнера равен
// GRID_PADDING, поэтому под карточки остаётся width - 2*padding - gap.
const GRID_GAP = 16;
const GRID_PADDING = 16;

type Props = {
  options: AddOption[];
  width: number;
  onPress: (option: AddOption) => void;
};

export default function AddOptionsGrid({ options, width, onPress }: Props) {
  const { theme } = useThemeContext();
  const itemWidth = (width - GRID_PADDING * 2 - GRID_GAP) / 2;

  return (
    <View style={[styles.container, { width }]}>
      {options.map((option, index) => (
        <Button
          key={`option-${option.label}-${index}`}
          variant="base"
          size="base"
          style={{ width: itemWidth, position: "relative" }}
          onPress={() => {
            onPress(option);
          }}
        >
          {option.isPro && <ProLabel />}
          <Card style={styles.card}>
            <option.icon
              size={28}
              color={getColor("foreground", undefined, theme)}
            />
            <Text size="14" weight="500">
              {option.label}
            </Text>
          </Card>
        </Button>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: GRID_GAP,
    padding: GRID_PADDING,
  },
  card: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
});
