import { StyleSheet, Switch, View } from "react-native";
import getColor from "@/lib/ui/getColor";
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
  return (
    <View style={[styles.container, !isLast && { borderBottomWidth: 1 }]}>
      <View style={styles.row}>
        <Icon size={18} color={getColor("foreground")} />
        <View style={styles.textContainer}>
          <Text size="16" weight="500">
            {text}
          </Text>
          {caption && (
            <Text size="14" color={getColor("mutedForeground")}>
              {caption}
            </Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: getColor("muted"), true: getColor("primary") }}
          thumbColor={getColor("base")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: getColor("muted"),
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textContainer: {
    flex: 1,
  },
});
