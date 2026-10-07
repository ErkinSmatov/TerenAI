import { View } from "react-native";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Trash2Icon } from "lucide-react-native";
import Text from "../ui/Text";
import Button from "../ui/Button";
import AlertDialog from "../ui/AlertDialog";
import getColor from "@/lib/ui/getColor";
import getNutrientGlow from "@/lib/ui/getNutrientGlow";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { useThemeContext } from "@/context/ThemeContext";
import { CARD_BACKGROUND_DARK, CARD_GLOW } from "./observerCardTheme";

type Props = {
  displayName: string;
  linkedAt: number;
  onRevoke: () => void;
};

export default function ObserverCard({
  displayName,
  linkedAt,
  onRevoke,
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.card,
        getNutrientGlow(theme, CARD_GLOW.dark, CARD_GLOW.light),
      ]}
    >
      <View style={styles.avatar}>
        <Text
          size="20"
          weight="600"
          color={getColor("background", undefined, theme)}
        >
          {initial}
        </Text>
      </View>
      <View style={styles.textContainer}>
        <Text size="16" weight="600" numberOfLines={1}>
          {displayName}
        </Text>
        <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
          {`Подключён ${format(linkedAt, "d MMMM", { locale: ru })}`}
        </Text>
      </View>
      <AlertDialog
        trigger={
          <Button
            variant="base"
            size="base"
            style={styles.revokeButton}
            accessibilityLabel="Отозвать доступ"
          >
            <Trash2Icon
              size={18}
              color={getColor("destructive", undefined, theme)}
            />
          </Button>
        }
        destructive
        title="Отозвать доступ"
        description="Наблюдатель больше не будет видеть ваши данные. Чтобы вернуть доступ, поделитесь кодом снова."
        onConfirm={onRevoke}
      />
    </View>
  );
}

const createStyles = (theme: ThemeName) =>
  ({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 32,
      padding: 20,
      backgroundColor:
        theme === "dark"
          ? CARD_BACKGROUND_DARK
          : getColor("base", undefined, theme),
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: getColor("primary", undefined, theme),
    },
    textContainer: {
      flex: 1,
      gap: 2,
    },
    revokeButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
  }) as const;
