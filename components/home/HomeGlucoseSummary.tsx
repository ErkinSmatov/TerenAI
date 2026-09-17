import { View } from "react-native";
import { format } from "date-fns";
import { DropletIcon } from "lucide-react-native";
import Text from "../ui/Text";
import Card from "../ui/Card";
import Button from "../ui/Button";
import SafeArea from "../ui/SafeArea";
import WarningBadge from "../ui/WarningBadge";
import SugarByHourChart from "../charts/SugarByHourChart";
import { Doc } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import { Link } from "expo-router";
import { glucoseContextLabels } from "@/config/glucoseConfig";
import { isGlucoseOutOfRange } from "@/convex/observers/utils/thresholds";
import { GlucoseEstimate } from "@/lib/nutrition/estimateGlucoseFromMeals";
import { useThemeContext } from "@/context/ThemeContext";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import type { ThemeName } from "@/lib/ui/palettes";

type ReadingRowProps = {
  reading: Doc<"glucoseReadings">;
};

function ReadingRow({ reading }: ReadingRowProps) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <DropletIcon size={16} color={getColor("blue", undefined, theme)} />
      </View>
      <View style={styles.rowTextContainer}>
        <Text size="16" weight="600">
          <Text size="16" weight="600" family="outfit">
            {reading.value}
          </Text>{" "}
          {reading.unit}
        </Text>
        {reading.context && (
          <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
            {glucoseContextLabels[reading.context]}
          </Text>
        )}
      </View>
      <Text size="14" color={getColor("mutedForeground", undefined, theme)}>
        {format(reading.recordedAt, "HH:mm")}
      </Text>
    </View>
  );
}

type EstimateRowProps = {
  estimate: GlucoseEstimate;
};

function EstimateRow({ estimate }: EstimateRowProps) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.rowIconEstimate}>
        <DropletIcon size={16} color={getColor("blue", undefined, theme)} />
      </View>
      <View style={styles.rowTextContainer}>
        <Text size="16" weight="600" color={getColor("blue", undefined, theme)}>
          ≈{" "}
          <Text
            size="16"
            weight="600"
            family="outfit"
            color={getColor("blue", undefined, theme)}
          >
            {estimate.value}
          </Text>{" "}
          {estimate.unit}
        </Text>
        <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
          Оценка по сахару в еде
        </Text>
      </View>
    </View>
  );
}

type Props = {
  readings: Doc<"glucoseReadings">[];
  readOnly?: boolean;
  estimate?: GlucoseEstimate | null;
};

export default function HomeGlucoseSummary({
  readings,
  readOnly = false,
  estimate,
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const latestReadings = readings.slice(0, 3);

  const isOutOfRange =
    readings.length > 0
      ? readings.some((reading) =>
          isGlucoseOutOfRange(reading.value, reading.unit, reading.context)
        )
      : estimate
        ? isGlucoseOutOfRange(estimate.value, estimate.unit, "afterMeal")
        : false;

  const cardContent = (
    <Card
      style={styles.card}
      glow={readings.length > 0 ? (isOutOfRange ? "destructive" : "success") : undefined}
    >
      {latestReadings.length > 0 || estimate ? (
        <>
          {readings.length > 0 && <SugarByHourChart readings={readings} />}
          {latestReadings.map((reading) => (
            <ReadingRow key={reading._id} reading={reading} />
          ))}
          {estimate && <EstimateRow estimate={estimate} />}
        </>
      ) : (
        <Text
          size="14"
          color={getColor("mutedForeground", 0.5, theme)}
          style={styles.empty}
        >
          Добавьте показание, чтобы увидеть его здесь&hellip;
        </Text>
      )}
      {isOutOfRange && <WarningBadge text="Глюкоза вне нормы" color="red" />}
    </Card>
  );

  return (
    <SafeArea edges={["left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text size="20" weight="600">
          Уровень сахара
        </Text>
        {!readOnly && (
          <Link href="/app/(home)/glucoseLog" asChild>
            <Button variant="text" size="sm">
              Все
            </Button>
          </Link>
        )}
      </View>

      {readOnly ? (
        cardContent
      ) : (
        <Link href="/app/(home)/glucoseLog" asChild>
          <Button variant="base" size="base">
            {cardContent}
          </Button>
        </Link>
      )}
    </SafeArea>
  );
}

const createStyles = (theme: ThemeName) => ({
  safeArea: {
    flex: 0,
    backgroundColor: "transparent",
    paddingTop: 32,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingBottom: 16,
  },
  card: {
    gap: 16,
  },
  empty: {
    textAlign: "center" as const,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  rowIcon: {
    height: 32,
    width: 32,
    borderRadius: 999,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: getColor("muted", undefined, theme),
  },
  rowIconEstimate: {
    height: 32,
    width: 32,
    borderRadius: 999,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderStyle: "dashed" as const,
    borderWidth: 1,
    borderColor: getColor("blue", undefined, theme),
  },
  rowTextContainer: {
    flex: 1,
    gap: 2,
  },
});
