import { StyleSheet, View } from "react-native";
import Button from "../ui/Button";
import Card from "../ui/Card";
import WithSkeleton from "../ui/WithSkeleton";
import Text from "../ui/Text";
import getColor from "@/lib/ui/getColor";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import { ComponentType } from "react";
import { LucideProps } from "lucide-react-native";

type Props = {
  item: {
    label: string;
    Icon: ComponentType<LucideProps>;
    color: string;
    value: number;
    unit: string;
  };
  loading: boolean;
  onPress?: () => void;
};

export default function MealSummaryCardBig({ item, loading, onPress }: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  return (
    <Button variant="base" size="base" onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.iconContainer}>
          <item.Icon color={item.color} />
        </View>
        <View style={styles.textContainer}>
          <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
            {item.label}
          </Text>
          <WithSkeleton
            loading={loading}
            skeletonStyle={{ height: 24, width: 100, borderRadius: 6 }}
          >
            <Text size="24" weight="700">
              {Math.round(item.value)} {item.unit}
            </Text>
          </WithSkeleton>
        </View>
      </Card>
    </Button>
  );
}

const createStyles = (theme: ThemeName) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      gap: 12,
      padding: 12,
    },
    iconContainer: {
      height: 64,
      width: 64,
      borderRadius: 16,
      backgroundColor: getColor("muted", undefined, theme),
      alignItems: "center",
      justifyContent: "center",
    },
    textContainer: {
      justifyContent: "center",
    },
  });
