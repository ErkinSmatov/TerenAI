import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
} from "@/components/ui/screen/ScreenMain";
import Text from "@/components/ui/Text";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AlertDialog from "@/components/ui/AlertDialog";
import { HeartPulseIcon, TrashIcon } from "lucide-react-native";
import { View } from "react-native";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

type ReadingRowProps = {
  reading: Doc<"bloodPressureReadings">;
};

function ReadingRow({ reading }: ReadingRowProps) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const deleteReading = useMutation(api.bloodPressure.deleteReading.default);

  return (
    <Card style={styles.card}>
      <View style={styles.rowIcon}>
        <HeartPulseIcon size={18} color={getColor("red", undefined, theme)} />
      </View>
      <View style={styles.rowTextContainer}>
        <Text size="16" weight="600">
          {reading.systolic}/{reading.diastolic}
          {reading.pulse !== undefined ? ` · ${reading.pulse} уд/мин` : ""}
        </Text>
        <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
          {format(reading._creationTime, "d MMMM, HH:mm", { locale: ru })}
        </Text>
      </View>
      <AlertDialog
        trigger={
          <Button
            variant="base"
            size="base"
            style={styles.deleteButton}
            hitSlop={10}
          >
            <TrashIcon size={18} color={getColor("mutedForeground", undefined, theme)} />
          </Button>
        }
        destructive
        title="Удалить показание?"
        description="Это действие нельзя отменить."
        onConfirm={() => void deleteReading({ readingId: reading._id })}
      />
    </Card>
  );
}

export default function BloodPressureLogScreen() {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const { scrollY, onScroll } = useScrollY();
  const readings = useQuery(api.bloodPressure.getAllReadings.default);

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Давление" />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <View style={styles.container}>
          {readings === undefined ? null : readings.length === 0 ? (
            <Text
              size="14"
              color={getColor("mutedForeground", 0.5, theme)}
              style={styles.empty}
            >
              Пока нет ни одного показания&hellip;
            </Text>
          ) : (
            readings.map((reading) => (
              <ReadingRow key={reading._id} reading={reading} />
            ))
          )}
        </View>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const createStyles = (theme: ThemeName) => ({
  container: {
    gap: 12,
  },
  empty: {
    textAlign: "center" as const,
    paddingTop: 40,
  },
  card: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  rowIcon: {
    height: 36,
    width: 36,
    borderRadius: 999,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: getColor("muted", undefined, theme),
  },
  rowTextContainer: {
    flex: 1,
    gap: 2,
  },
  deleteButton: {
    height: 36,
    width: 36,
    borderRadius: 999,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
