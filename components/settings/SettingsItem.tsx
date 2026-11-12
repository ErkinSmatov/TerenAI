import { View } from "react-native";
import Button from "../ui/Button";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import type { ThemeName } from "@/lib/ui/palettes";
import { LucideIcon } from "lucide-react-native";
import Text from "../ui/Text";

type Props = {
  text: string;
  Icon: LucideIcon;
  onPress?: () => void;
  isLast?: boolean;
  destructive?: boolean;
};

export default function SettingsItem({
  text,
  Icon,
  onPress,
  isLast,
  destructive = false,
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const color = destructive
    ? getColor("destructive", undefined, theme)
    : getColor("foreground", undefined, theme);

  return (
    <View style={[styles.container, !isLast && { borderBottomWidth: 1 }]}>
      <Button
        variant="base"
        size="base"
        style={styles.button}
        onPress={onPress}
      >
        <Icon size={18} color={color} />
        <Text size="16" weight="500" color={color}>
          {text}
        </Text>
      </Button>
    </View>
  );
}

const createStyles = (theme: ThemeName) => ({
  container: {
    borderColor: getColor("muted", undefined, theme),
  },
  button: {
    height: 52,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 16,
  },
});
