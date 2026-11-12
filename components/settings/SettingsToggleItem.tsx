import { Switch, View } from "react-native";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import type { ThemeName } from "@/lib/ui/palettes";
import { LucideIcon } from "lucide-react-native";
import Text from "../ui/Text";

type Props = {
  text: string;
  caption?: string;
  Icon: LucideIcon;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
};

export default function SettingsToggleItem({
  text,
  caption,
  Icon,
  value,
  onValueChange,
  isLast,
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.container, !isLast && { borderBottomWidth: 1 }]}>
      <View style={styles.row}>
        <Icon size={18} color={getColor("foreground", undefined, theme)} />
        <View style={styles.textContainer}>
          <Text size="16" weight="500">
            {text}
          </Text>
          {caption && (
            <Text
              size="14"
              color={getColor("mutedForeground", undefined, theme)}
            >
              {caption}
            </Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{
            false: getColor("muted", undefined, theme),
            true: getColor("primary", undefined, theme),
          }}
          thumbColor={getColor("base", undefined, theme)}
        />
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeName) => ({
  container: {
    borderColor: getColor("muted", undefined, theme),
  },
  row: {
    minHeight: 52,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textContainer: {
    flex: 1,
  },
});
