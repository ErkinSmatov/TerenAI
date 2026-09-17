import { View } from "react-native";
import { TriangleAlertIcon } from "lucide-react-native";
import Text from "./Text";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import useThemedStyles from "@/lib/ui/useThemedStyles";

type BadgeProps = {
  text: string;
  color: "amber" | "red";
};

const createStyles = () => ({
  badge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    gap: 4,
    padding: 8,
    borderRadius: 8,
  },
});

export default function WarningBadge({ text, color }: BadgeProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useThemeContext();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: getColor(color, 0.12, theme) },
      ]}
    >
      <TriangleAlertIcon size={14} color={getColor(color, undefined, theme)} />
      <Text size="12" weight="400" color={getColor(color, undefined, theme)}>
        {text}
      </Text>
    </View>
  );
}
