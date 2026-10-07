import React, { useRef } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import BottomSheet from "../ui/BottomSheet";
import Text from "../ui/Text";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import AddOptionsGrid from "../tabs/AddOptionsGrid";
import { MEAL_ADD_OPTIONS } from "../tabs/addMealOptions";
import { useAddOptionPress } from "../tabs/useAddOptionPress";
import { parseLocalDate } from "@/lib/utils/parseLocalDate";

type Props = {
  date: string;
  ref?: React.Ref<BottomSheetModal>;
};

// Лист выбора способа добавления блюда за конкретный (прошлый) день. Те же
// карточки и гейтинг (Pro, лимит ИИ), что и в меню «+», но с параметром date.
export default function DayAddMealSheet({ date, ref }: Props) {
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();
  const press = useAddOptionPress();
  const sheetRef = useRef<BottomSheetModal | null>(null);

  const mergedRef = (node: BottomSheetModal | null) => {
    sheetRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as { current: BottomSheetModal | null }).current = node;
    }
  };

  const parsed = parseLocalDate(date);
  const subtitle = parsed
    ? `за ${format(parsed.target, "d MMMM", { locale: ru })}`
    : "";

  return (
    <BottomSheet ref={mergedRef}>
      <View style={styles.header}>
        <Text size="18" weight="600">
          Добавить блюдо
        </Text>
        {subtitle ? (
          <Text size="14" color={getColor("mutedForeground", undefined, theme)}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <AddOptionsGrid
        options={MEAL_ADD_OPTIONS}
        width={width - 32}
        onPress={(option) => {
          press(option, {
            date,
            beforeNavigate: () => {
              sheetRef.current?.dismiss();
            },
          });
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 2,
  },
});
