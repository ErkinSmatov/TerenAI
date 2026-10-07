import { CircleFadingPlusIcon } from "lucide-react-native";
import { Href, Link } from "expo-router";
import Button from "../ui/Button";
import Text from "../ui/Text";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

type Props = {
  text: string;
  href?: Href;
  // Если задан — вместо перехода по href вызывается обработчик (например,
  // открытие листа выбора способа добавления за конкретный день).
  onPress?: () => void;
};

// Общее пустое состояние для блоков Главной без данных (Сахар/Давление/
// Рацион) — иконка-кнопка "добавить показание" ведёт сразу на нужный экран
// добавления вместо нейтрального текста без действия.
export default function HomeEmptyState({ text, href, onPress }: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  const content = (
    <Button
      variant="base"
      size="base"
      style={styles.container}
      onPress={onPress}
    >
      <CircleFadingPlusIcon
        size={28}
        color={getColor("mutedForeground", undefined, theme)}
      />
      <Text
        size="14"
        color={getColor("mutedForeground", 0.8, theme)}
        style={styles.text}
      >
        {text}
      </Text>
    </Button>
  );

  if (onPress || !href) {
    return content;
  }

  return (
    <Link href={href} asChild>
      {content}
    </Link>
  );
}

const createStyles = (_theme: ThemeName) => ({
  container: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 24,
  },
  text: {
    textAlign: "center" as const,
  },
});
