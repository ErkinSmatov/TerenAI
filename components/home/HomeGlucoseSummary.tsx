import { StyleSheet, View } from "react-native";
import { format } from "date-fns";
import { DropletIcon } from "lucide-react-native";
import Text from "../ui/Text";
import Card from "../ui/Card";
import Button from "../ui/Button";
import SafeArea from "../ui/SafeArea";
import { Doc } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import { Link } from "expo-router";
import { glucoseContextLabels } from "@/config/glucoseConfig";

type ReadingRowProps = {
  reading: Doc<"glucoseReadings">;
};

function ReadingRow({ reading }: ReadingRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <DropletIcon size={16} color={getColor("blue")} />
      </View>
      <View style={styles.rowTextContainer}>
        <Text size="16" weight="600">
          {reading.value} {reading.unit}
        </Text>
        {reading.context && (
          <Text size="12" color={getColor("mutedForeground")}>
            {glucoseContextLabels[reading.context]}
          </Text>
        )}
      </View>
      <Text size="14" color={getColor("mutedForeground")}>
        {format(reading._creationTime, "HH:mm")}
      </Text>
    </View>
  );
}

type Props = {
  readings: Doc<"glucoseReadings">[];
};

export default function HomeGlucoseSummary({ readings }: Props) {
  const latestReadings = readings.slice(0, 3);

  return (
    <SafeArea edges={["left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text size="20" weight="600">
          Уровень сахара
        </Text>
        <Link href="/app/(home)/glucoseLog" asChild>
          <Button variant="text" size="sm">
            Все
          </Button>
        </Link>
      </View>

      <Link href="/app/(home)/glucoseLog" asChild>
        <Button variant="base" size="base">
          <Card style={styles.card}>
            {latestReadings.length > 0 ? (
              latestReadings.map((reading) => (
                <ReadingRow key={reading._id} reading={reading} />
              ))
            ) : (
              <Text
                size="14"
                color={getColor("mutedForeground", 0.5)}
                style={styles.empty}
              >
                Добавьте показание, чтобы увидеть его здесь&hellip;
              </Text>
            )}
          </Card>
        </Button>
      </Link>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 0,
    backgroundColor: "transparent",
    paddingTop: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
  },
  card: {
    gap: 16,
  },
  empty: {
    textAlign: "center",
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIcon: {
    height: 32,
    width: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: getColor("muted"),
  },
  rowTextContainer: {
    flex: 1,
    gap: 2,
  },
});
