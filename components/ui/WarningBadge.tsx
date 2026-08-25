import { StyleSheet, View } from "react-native";
import { TriangleAlertIcon } from "lucide-react-native";
import Text from "./Text";
import getColor from "@/lib/ui/getColor";

type BadgeProps = {
  text: string;
  color: "amber" | "red";
};

export default function WarningBadge({ text, color }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: getColor(color, 0.12) },
      ]}
    >
      <TriangleAlertIcon size={14} color={getColor(color)} />
      <Text size="12" weight="400" color={getColor(color)}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    padding: 8,
    borderRadius: 8,
  },
});
