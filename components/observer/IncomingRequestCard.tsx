import { View } from "react-native";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Text from "../ui/Text";
import Button from "../ui/Button";
import getColor from "@/lib/ui/getColor";
import getNutrientGlow from "@/lib/ui/getNutrientGlow";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { useThemeContext } from "@/context/ThemeContext";
import { CARD_BACKGROUND_DARK, CARD_GLOW } from "./observerCardTheme";

type Props = {
  displayName: string;
  requestedAt: number;
  // Клиника приходит из серверного поля doctor (только для verified);
  // компонент сам пометку не вычисляет.
  doctorClinic: string | null;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export default function IncomingRequestCard({
  displayName,
  requestedAt,
  doctorClinic,
  busy = false,
  onAccept,
  onDecline,
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
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text
            size="20"
            weight="600"
            color={getColor("primaryForeground", undefined, theme)}
          >
            {initial}
          </Text>
        </View>
        <View style={styles.textContainer}>
          <Text size="16" weight="600">
            {`${displayName} хочет наблюдать за вами`}
          </Text>
          {doctorClinic ? (
            <Text size="12" color={getColor("primary", undefined, theme)}>
              {`Врач · ${doctorClinic}`}
            </Text>
          ) : null}
          <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
            {`Запрос от ${format(requestedAt, "d MMMM", { locale: ru })}`}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          variant="primary"
          size="md"
          style={styles.actionButton}
          disabled={busy}
          accessibilityLabel={`Разрешить наблюдение: ${displayName}`}
          onPress={onAccept}
        >
          Разрешить
        </Button>
        <Button
          variant="secondary"
          size="md"
          style={styles.actionButton}
          disabled={busy}
          accessibilityLabel={`Отклонить запрос: ${displayName}`}
          onPress={onDecline}
        >
          Отклонить
        </Button>
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeName) =>
  ({
    card: {
      gap: 16,
      borderRadius: 32,
      padding: 20,
      backgroundColor:
        theme === "dark"
          ? CARD_BACKGROUND_DARK
          : getColor("base", undefined, theme),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
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
    actions: {
      flexDirection: "row",
      gap: 8,
    },
    actionButton: {
      flex: 1,
    },
  }) as const;
