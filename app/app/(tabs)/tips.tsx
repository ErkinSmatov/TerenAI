import { StyleSheet, View } from "react-native";
import { MessageSquareTextIcon } from "lucide-react-native";
import SafeArea from "@/components/ui/SafeArea";
import Text from "@/components/ui/Text";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";

// Статичный плейсхолдер вкладки "Советы" — осознанное, одобренное пользователем
// исключение из решения CONTEXT.md "никакие новые разделы не добавляются"
// (07.1-07-CORRECTION-8). Никаких запросов/мутаций/интерактива — только текст.
export default function TipsScreen() {
  const { theme } = useThemeContext();

  return (
    <SafeArea style={styles.safeArea}>
      <View style={styles.content}>
        <MessageSquareTextIcon
          size={48}
          strokeWidth={1.5}
          color={getColor("mutedForeground", undefined, theme)}
        />
        <Text size="20" weight="600">
          Советы
        </Text>
        <Text
          size="14"
          color={getColor("mutedForeground", undefined, theme)}
          style={styles.description}
        >
          Этот раздел скоро будет доступен.
        </Text>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  description: {
    textAlign: "center",
  },
});
