import { StyleSheet, View } from "react-native";
import { FlameIcon, FootprintsIcon, RouteIcon } from "lucide-react-native";
import Text from "../ui/Text";
import Card from "../ui/Card";
import Button from "../ui/Button";
import SafeArea from "../ui/SafeArea";
import { Doc } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import { Link } from "expo-router";

type StatProps = {
  Icon: typeof FootprintsIcon;
  value: string;
  label: string;
};

function Stat({ Icon, value, label }: StatProps) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <Icon size={16} color={getColor("green")} />
      </View>
      <View>
        <Text size="16" weight="600">
          {value}
        </Text>
        <Text size="12" color={getColor("mutedForeground")}>
          {label}
        </Text>
      </View>
    </View>
  );
}

type Props = {
  movement: Doc<"movementData"> | null;
};

export default function HomeMovementSummary({ movement }: Props) {
  return (
    <SafeArea edges={["left", "right"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text size="20" weight="600">
          Активность
        </Text>
        <Link href="/app/(home)/movementLog" asChild>
          <Button variant="text" size="sm">
            Все
          </Button>
        </Link>
      </View>

      <Link href={movement ? "/app/(home)/movementLog" : "/app/(settings)/health"} asChild>
        <Button variant="base" size="base">
          <Card style={styles.card}>
            {movement ? (
              <>
                <Stat
                  Icon={FootprintsIcon}
                  value={movement.steps.toLocaleString("ru-RU")}
                  label="Шаги"
                />
                <Stat
                  Icon={FlameIcon}
                  value={`${movement.activeEnergyKcal}`}
                  label="Ккал"
                />
                <Stat
                  Icon={RouteIcon}
                  value={(movement.distanceMeters / 1000).toFixed(1)}
                  label="Км"
                />
              </>
            ) : (
              <Text
                size="14"
                color={getColor("mutedForeground", 0.5)}
                style={styles.empty}
              >
                Подключите Apple Health, чтобы видеть активность&hellip;
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
    flexDirection: "row",
    justifyContent: "space-between",
  },
  empty: {
    textAlign: "center",
    paddingVertical: 8,
    flex: 1,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    height: 32,
    width: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: getColor("muted"),
  },
});
