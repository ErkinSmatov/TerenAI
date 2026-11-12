import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { BadgeDefinition } from "@/lib/badges/badgeDefinitions";
import getColor from "@/lib/ui/getColor";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { TrophyIcon, UtensilsIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

type Props = {
  definition: BadgeDefinition;
  earnedAt?: number;
};

export default function BadgeTile({ definition, earnedAt }: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const earned = earnedAt !== undefined;
  const iconColor = earned ? getColor("orange", undefined, theme) : getColor("mutedForeground", undefined, theme);
  const Icon = definition.type === "streak" ? TrophyIcon : UtensilsIcon;

  return (
    <Card
      style={[styles.card, !earned && styles.cardLocked]}
      accessibilityLabel={`${definition.name}, порог ${definition.threshold}`}
    >
      <View style={styles.iconRow}>
        <Icon size={32} color={iconColor} />
      </View>
      <Text
        size="16"
        weight="500"
        color={earned ? getColor("foreground", undefined, theme) : getColor("mutedForeground", undefined, theme)}
      >
        {definition.name}
      </Text>
      <Text size="14" color={getColor("mutedForeground", undefined, theme)} style={styles.caption}>
        {definition.description}
      </Text>
      {earned && (
        <Text size="14" color={getColor("mutedForeground", undefined, theme)}>
          {format(new Date(earnedAt), "d MMMM yyyy", { locale: ru })}
        </Text>
      )}
    </Card>
  );
}

const createStyles = (theme: ThemeName) =>
  StyleSheet.create({
  card: {
    width: "48%",
  },
  cardLocked: {
    backgroundColor: getColor("muted", undefined, theme),
  },
  iconRow: {
    marginBottom: 8,
  },
  caption: {
    marginBottom: 4,
  },
});
