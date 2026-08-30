import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { BadgeDefinition } from "@/lib/badges/badgeDefinitions";
import getColor from "@/lib/ui/getColor";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { TrophyIcon, UtensilsIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

type Props = {
  definition: BadgeDefinition;
  earnedAt?: number;
};

export default function BadgeTile({ definition, earnedAt }: Props) {
  const earned = earnedAt !== undefined;
  const iconColor = earned ? getColor("orange") : getColor("mutedForeground");
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
        color={earned ? getColor("foreground") : getColor("mutedForeground")}
      >
        {definition.name}
      </Text>
      <Text size="14" color={getColor("mutedForeground")} style={styles.caption}>
        {definition.description}
      </Text>
      {earned && (
        <Text size="14" color={getColor("mutedForeground")}>
          {format(new Date(earnedAt), "d MMMM yyyy", { locale: ru })}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
  },
  cardLocked: {
    backgroundColor: getColor("muted"),
  },
  iconRow: {
    marginBottom: 8,
  },
  caption: {
    marginBottom: 4,
  },
});
