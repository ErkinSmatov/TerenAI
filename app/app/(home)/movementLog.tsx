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
import { FlameIcon, FootprintsIcon, RouteIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import getColor from "@/lib/ui/getColor";
import getLocalWeekBounds from "@/lib/utils/getLocalWeekBounds";

type DayRowProps = {
  date: string;
  movement: Doc<"movementData"> | null;
};

function DayRow({ date, movement }: DayRowProps) {
  return (
    <Card style={styles.card}>
      <Text size="14" weight="600" style={styles.date}>
        {format(new Date(`${date}T00:00:00`), "d MMMM, EEEE", { locale: ru })}
      </Text>
      {movement ? (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <FootprintsIcon size={16} color={getColor("green")} />
            <Text size="14">{movement.steps.toLocaleString("ru-RU")}</Text>
          </View>
          <View style={styles.stat}>
            <FlameIcon size={16} color={getColor("green")} />
            <Text size="14">{movement.activeEnergyKcal} ккал</Text>
          </View>
          <View style={styles.stat}>
            <RouteIcon size={16} color={getColor("green")} />
            <Text size="14">
              {(movement.distanceMeters / 1000).toFixed(1)} км
            </Text>
          </View>
        </View>
      ) : (
        <Text size="14" color={getColor("mutedForeground", 0.5)}>
          Нет данных
        </Text>
      )}
    </Card>
  );
}

export default function MovementLogScreen() {
  const { scrollY, onScroll } = useScrollY();
  const weekBounds = getLocalWeekBounds();
  const week = useQuery(api.movement.getWeekMovement.default, {
    weekDates: weekBounds.weekDates,
  });

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Активность" />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <View style={styles.container}>
          {week === undefined
            ? null
            : weekBounds.weekDates
                .map((date, index) => (
                  <DayRow key={date} date={date} movement={week[index]} />
                ))
                .reverse()}
        </View>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    gap: 8,
  },
  date: {
    textTransform: "capitalize",
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
