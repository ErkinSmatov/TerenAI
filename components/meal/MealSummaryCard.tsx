import { StyleSheet, View } from "react-native";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Text from "../ui/Text";
import WithSkeleton from "../ui/WithSkeleton";
import { ComponentType } from "react";
import { LucideProps } from "lucide-react-native";
import getColor from "@/lib/ui/getColor";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";

type Props = {
  item: {
    label: string;
    Icon: ComponentType<LucideProps>;
    color: string;
    value: number;
    unit: string;
  };
  loading: boolean;
};

export default function MealSummaryCard({ item, loading }: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  return (
    <Button variant="base" size="base" style={styles.cardButton}>
      <Card style={styles.card}>
        <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
          {item.label}
        </Text>
        <View style={styles.valueContainer}>
          <View style={styles.iconContainer}>
            <item.Icon size={14} color={item.color} />
          </View>
          <WithSkeleton
            loading={loading}
            skeletonStyle={{ height: 16, width: 40, borderRadius: 4 }}
          >
            <Text size="16" weight="600">
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
    cardButton: {
      flex: 1,
    },
    card: {
      flex: 1,
      padding: 12,
      gap: 8,
    },
    valueContainer: {
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
    },
    iconContainer: {
      height: 22,
      width: 22,
      borderRadius: 16,
      backgroundColor: getColor("muted", undefined, theme),
      alignItems: "center",
      justifyContent: "center",
    },
  });
