import { View } from "react-native";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ClockIcon, XIcon } from "lucide-react-native";
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
  requestedAt: number;
  onCancel: () => void;
};

// Заглушка ожидающего запроса: до подтверждения пациентом никаких данных о нём.
export default function PendingObservedCard({ requestedAt, onCancel }: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[
        styles.card,
        getNutrientGlow(theme, CARD_GLOW.dark, CARD_GLOW.light),
      ]}
    >
      <View style={styles.iconWrap}>
        <ClockIcon
          size={24}
          color={getColor("primaryForeground", undefined, theme)}
        />
      </View>
      <View style={styles.textContainer}>
        <Text size="16" weight="600" numberOfLines={1}>
          Запрос отправлен
        </Text>
        <Text size="14" color={getColor("mutedForeground", undefined, theme)}>
          Ожидает подтверждения
        </Text>
        <Text size="12" color={getColor("mutedForeground", 0.8, theme)}>
          {`Отправлен ${format(requestedAt, "d MMMM", { locale: ru })}`}
        </Text>
      </View>
      <AlertDialog
        trigger={
          <Button
            variant="base"
            size="base"
            style={styles.cancelButton}
            accessibilityLabel="Отменить запрос"
          >
            <XIcon size={18} color={getColor("destructive", undefined, theme)} />
          </Button>
        }
        destructive
        title="Отменить запрос"
        description="Запрос на наблюдение будет отменён. Код можно ввести снова позже."
        onConfirm={onCancel}
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
    iconWrap: {
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
    cancelButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
  }) as const;
