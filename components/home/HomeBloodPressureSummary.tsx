import { View } from "react-native";
import { format } from "date-fns";
import { HeartPulseIcon } from "lucide-react-native";
import Text from "../ui/Text";
import Card from "../ui/Card";
import Button from "../ui/Button";
import SafeArea from "../ui/SafeArea";
import BloodPressureLineChart from "../charts/BloodPressureLineChart";
import HomeEmptyState from "./HomeEmptyState";
import { Doc } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import { Link } from "expo-router";
import { useThemeContext } from "@/context/ThemeContext";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import type { ThemeName } from "@/lib/ui/palettes";

type ReadingRowProps = {
  reading: Doc<"bloodPressureReadings">;
};

function ReadingRow({ reading }: ReadingRowProps) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <HeartPulseIcon size={16} color={getColor("red", undefined, theme)} />
      </View>
      <View style={styles.rowTextContainer}>
        <Text size="16" weight="600" family="outfit">
          {reading.systolic}/{reading.diastolic}
        </Text>
        {reading.pulse !== undefined && (
          <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
            Пульс{" "}
            <Text size="12" family="outfit" color={getColor("mutedForeground", undefined, theme)}>
              {reading.pulse}
            </Text>
          </Text>
        )}
      </View>
      <Text size="14" color={getColor("mutedForeground", undefined, theme)}>
        {format(reading._creationTime, "HH:mm")}
      </Text>
    </View>
  );
}

type Props = {
  readings: Doc<"bloodPressureReadings">[];
  readOnly?: boolean;
};

export default function HomeBloodPressureSummary({
  readings,
  readOnly = false,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const latestReadings = readings.slice(0, 3);

  const cardContent = (
    <Card style={styles.card}>
      {latestReadings.length > 0 ? (
        <>
          <BloodPressureLineChart readings={readings} />
          {latestReadings.map((reading) => (
            <ReadingRow key={reading._id} reading={reading} />
          ))}
        </>
      ) : (
        <HomeEmptyState
          text="Добавьте показание, чтобы увидеть его здесь…"
          href="/app/(add)/bloodPressure"
        />
      )}
    </Card>
  );

  return (
    <SafeArea edges={["left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text size="20" weight="600">
          Давление
        </Text>
        {!readOnly && (
          <Link href="/app/(home)/bloodPressureLog" asChild>
            <Button variant="text" size="sm">
              Все
            </Button>
          </Link>
        )}
      </View>

      {readOnly ? (
        cardContent
      ) : (
        <Link href="/app/(home)/bloodPressureLog" asChild>
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
  rowTextContainer: {
    flex: 1,
    gap: 2,
  },
});
