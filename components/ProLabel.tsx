import { useSubscriptionContext } from "@/context/SubscriptionContext";
import { View } from "react-native";
import Text from "./ui/Text";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

export default function ProLabel() {
  const { hasProAccess } = useSubscriptionContext();
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  if (hasProAccess) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text size="12" weight="600" color={getColor("primaryForeground", undefined, theme)}>
        Pro
      </Text>
    </View>
  );
}

const createStyles = (theme: ThemeName) => ({
  container: {
    position: "absolute" as const,
    top: 8,
    left: 8,
    zIndex: 1,
    backgroundColor: getColor("primary", undefined, theme),
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
});
