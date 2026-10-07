import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
  ScreenMainTitle,
} from "@/components/ui/screen/ScreenMain";
import Text from "@/components/ui/Text";
import { CARD_BACKGROUND_DARK } from "@/components/observer/observerCardTheme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import { useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { StyleSheet, View } from "react-native";

function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type CellProps = { label: string; value: string; align?: "flex-start" | "flex-end" };

function Cell({ label, value, align = "flex-start" }: CellProps) {
  const { theme } = useThemeContext();

  return (
    <View style={[styles.cell, { alignItems: align }]}>
      <Text size="12" color={getColor("foreground", 0.65, theme)}>
        {label}
      </Text>
      <Text size="20" weight="600" family="outfit" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function ObservedHistoryScreen() {
  const { theme } = useThemeContext();
  const { patientId } = useLocalSearchParams<{ patientId: Id<"users"> }>();

  const days = useQuery(api.observers.getPatientHistory.default, {
    patientId,
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
  });

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="История" />
      </ScreenHeader>

      <ScreenMainScrollView safeAreaProps={{ edges: ["left", "right", "bottom"] }}>
        {days === undefined ? (
          <ScreenMainTitle loading />
        ) : days.length === 0 ? (
          <View style={styles.empty}>
            <Text size="20" weight="600" style={styles.emptyText}>
              Пока нет данных
            </Text>
            <Text
              size="14"
              color={getColor("mutedForeground", undefined, theme)}
              style={styles.emptyText}
            >
              За последние 30 дней записей не найдено.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {days.map((day) => {
              const glucoseValue = day.glucose
                ? `${day.glucose.average}`
                : "—";
              const glucoseHint = day.glucose
                ? `${day.glucose.min}–${day.glucose.max} ${day.glucose.unit}`
                : null;
              const distanceKm =
                typeof day.distanceMeters === "number"
                  ? Math.round(day.distanceMeters / 1000)
                  : null;

              return (
                <View
                  key={day.date}
                  style={[
                    styles.card,
                    {
                      backgroundColor:
                        theme === "dark"
                          ? CARD_BACKGROUND_DARK
                          : getColor("base", undefined, theme),
                    },
                  ]}
                >
                  <Text size="16" weight="600">
                    {capitalize(
                      format(parseDate(day.date), "d MMMM, EEEE", { locale: ru })
                    )}
                  </Text>
                  <View style={styles.row}>
                    <Cell label="Калории" value={String(day.calories)} />
                    <Cell
                      label="Активность"
                      value={
                        typeof day.steps === "number"
                          ? day.steps.toLocaleString("ru-RU")
                          : "—"
                      }
                    />
                    <Cell
                      label="Глюкоза"
                      value={glucoseValue}
                      align="flex-end"
                    />
                  </View>
                  {(distanceKm !== null || glucoseHint !== null) && (
                    <View style={styles.row}>
                      <Text
                        size="12"
                        color={getColor("mutedForeground", undefined, theme)}
                      >
                        {distanceKm !== null ? `${distanceKm} км` : ""}
                      </Text>
                      <Text
                        size="12"
                        color={getColor("mutedForeground", undefined, theme)}
                      >
                        {glucoseHint ?? ""}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cell: {
    flex: 1,
    gap: 4,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    textAlign: "center",
  },
});
