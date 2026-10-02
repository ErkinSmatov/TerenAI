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
  href: Href;
};

// Общее пустое состояние для блоков Главной без данных (Сахар/Давление/
// Рацион) — иконка-кнопка "добавить показание" ведёт сразу на нужный экран
// добавления вместо нейтрального текста без действия.
export default function HomeEmptyState({ text, href }: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  return (
    <Link href={href} asChild>
      <Button variant="base" size="base" style={styles.container}>
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
