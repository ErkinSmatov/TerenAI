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
import HomeMacroSummary from "@/components/home/HomeMacroSummary";
import HomeMicroSummary from "@/components/home/HomeMicroSummary";
import HomeRecentlyLogged from "@/components/home/HomeRecentlyLogged";
import HomeGlucoseSummary from "@/components/home/HomeGlucoseSummary";
import HomeBloodPressureSummary from "@/components/home/HomeBloodPressureSummary";
import { api } from "@/convex/_generated/api";
import { calculateDayTotals } from "@/lib/nutrition/calculateDayTotals";
import getLocalMonthBounds, {
  LocalMonthBounds,
} from "@/lib/utils/getLocalMonthBounds";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import getColor from "@/lib/ui/getColor";
import { useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { StyleSheet, View } from "react-native";

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type ParsedDayParam = {
  target: Date;
  day: number;
};

// Разбор строки маршрута вручную, а не передачей строки напрямую в
// конструктор Date: для формата "YYYY-MM-DD" спецификация трактует строку
// как полночь UTC, из-за чего в отрицательных смещениях (Америка) экран
// показал бы предыдущий день.
// Восстановление даты обратно в строку и сравнение с исходной строкой —
// защита от «мусорных» календарных значений вроде «2026-02-31».
function parseDayParam(date: string | undefined): ParsedDayParam | null {
  if (!date || !DATE_PARAM_PATTERN.test(date)) return null;

  const [year, month, day] = date.split("-").map(Number);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  const target = new Date(year, month - 1, day);
  if (Number.isNaN(target.getTime())) return null;

  const reconstructed = `${target.getFullYear()}-${String(
    target.getMonth() + 1
  ).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
  if (reconstructed !== date) return null;

  return { target, day };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function EmptyState({ body }: { body: string }) {
  return (
    <View style={styles.emptyStateContainer}>
      <Text size="20" weight="600" style={styles.emptyStateHeading}>
        Нет данных за этот день
      </Text>
      <Text
        size="14"
        color={getColor("mutedForeground", 0.5)}
        style={styles.emptyStateBody}
      >
        {body}
      </Text>
    </View>
  );
}

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { scrollY, onScroll } = useScrollY();

  const parsed = parseDayParam(date);
  const bounds: LocalMonthBounds | null = parsed
    ? getLocalMonthBounds(parsed.target)
    : null;
  const dayIndex = parsed ? parsed.day - 1 : -1;
  const isValidRoute =
    parsed !== null &&
    bounds !== null &&
    dayIndex >= 0 &&
    dayIndex < bounds.monthDates.length;

  const profile = useQuery(api.profiles.getProfile.default);
  const isGlucometerTrack = profile?.data?.goalTrack === "glucometer";

  const rawMonthMeals = useQuery(
    api.meals.getMonthMeals.default,
    isValidRoute ? { dayStartsUtc: bounds.dayStartsUtc } : "skip"
  );
  const rawMonthReadings = useQuery(
    api.glucose.getMonthReadings.default,
    isValidRoute && isGlucometerTrack
      ? { dayStartsUtc: bounds.dayStartsUtc }
      : "skip"
  );
  const rawMonthBloodPressure = useQuery(
    api.bloodPressure.getMonthReadings.default,
    isValidRoute && isGlucometerTrack
      ? { dayStartsUtc: bounds.dayStartsUtc }
      : "skip"
  );

  if (parsed === null || bounds === null || !isValidRoute) {
    return (
      <ScreenMain edges={[]}>
        <ScreenHeader scrollY={scrollY}>
          <ScreenHeaderBackButton />
          <ScreenHeaderTitle title="Ошибка" />
        </ScreenHeader>
        <ScreenMainScrollView
          scrollViewProps={{ onScroll }}
          safeAreaProps={{ edges: ["left", "right", "bottom"] }}
        >
          <EmptyState body="Не удалось загрузить историю. Проверьте соединение и попробуйте ещё раз." />
        </ScreenMainScrollView>
      </ScreenMain>
    );
  }

  const stillLoading =
    rawMonthMeals === undefined ||
    (isGlucometerTrack &&
      (rawMonthReadings === undefined || rawMonthBloodPressure === undefined));

  if (stillLoading) {
    return (
      <ScreenMain edges={[]}>
        <ScreenHeader scrollY={scrollY}>
          <ScreenHeaderBackButton />
          <ScreenHeaderTitle title="Загрузка…" />
        </ScreenHeader>
        <ScreenMainScrollView
          scrollViewProps={{ onScroll }}
          safeAreaProps={{ edges: ["left", "right", "bottom"] }}
        >
          <ScreenMainTitle loading />
        </ScreenMainScrollView>
      </ScreenMain>
    );
  }

  const monthLength = bounds.monthDates.length;
  const monthReadings =
    rawMonthReadings ?? Array.from({ length: monthLength }, () => []);
  const monthBloodPressure =
    rawMonthBloodPressure ?? Array.from({ length: monthLength }, () => []);

  const dayMeals = rawMonthMeals.at(dayIndex) ?? [];
  const dayReadings = monthReadings.at(dayIndex) ?? [];
  const dayBloodPressure = monthBloodPressure.at(dayIndex) ?? [];

  const hasData =
    dayMeals.length > 0 ||
    dayReadings.length > 0 ||
    dayBloodPressure.length > 0;

  const dayTotals = calculateDayTotals(dayMeals);
  const title = capitalize(
    format(parsed.target, "d MMMM", { locale: ru })
  );

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title={title} />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        {hasData ? (
          <>
            <HomeRecentlyLogged meals={dayMeals} readOnly />
            <View style={styles.summaryStack}>
              <HomeMacroSummary
                totalMacros={dayTotals.macros}
                targets={profile?.targets ?? undefined}
                readOnly
              />
              <HomeMicroSummary
                totalMicros={dayTotals.micros}
                dayIndex={dayIndex}
                readOnly
              />
            </View>
            {isGlucometerTrack && (
              // estimate намеренно не передаётся: оценка глюкозы по сахару
              // в еде считается от "сейчас" (кривая распада от текущего
              // момента), поэтому для исторической даты она бессмысленна.
              <HomeGlucoseSummary readings={dayReadings} readOnly />
            )}
            {isGlucometerTrack && (
              <HomeBloodPressureSummary
                readings={dayBloodPressure}
                readOnly
              />
            )}
          </>
        ) : (
          <EmptyState body="Записи о питании и показателях за эту дату отсутствуют. Выберите другой день в календаре." />
        )}
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  summaryStack: {
    gap: 18,
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyStateHeading: {
    textAlign: "center",
  },
  emptyStateBody: {
    textAlign: "center",
  },
});
