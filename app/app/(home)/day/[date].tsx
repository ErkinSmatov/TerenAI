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
import DayAddMealSheet from "@/components/home/DayAddMealSheet";
import {
  isFutureLocalDay,
  parseLocalDate,
} from "@/lib/utils/parseLocalDate";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import getColor from "@/lib/ui/getColor";
import { useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Platform, StyleSheet, View } from "react-native";

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
  const sheetRef = useRef<BottomSheetModal>(null);

  const parsed = parseLocalDate(date);
  const bounds: LocalMonthBounds | null = parsed
    ? getLocalMonthBounds(parsed.target)
    : null;
  // D-07: для будущей даты добавления нет (маршрут можно открыть вручную).
  const canAdd = parsed !== null && !isFutureLocalDay(parsed.target, Date.now());
  const openAddSheet = () => {
    sheetRef.current?.present();
  };
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

  const rawMonthMovement = useQuery(
    api.movement.getMonthMovement.default,
    isValidRoute && Platform.OS === "ios"
      ? { monthDates: bounds.monthDates }
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
      (rawMonthReadings === undefined || rawMonthBloodPressure === undefined)) ||
    (Platform.OS === "ios" && rawMonthMovement === undefined);

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
  const monthMovement =
    rawMonthMovement ?? Array.from({ length: monthLength }, () => null);

  const dayMeals = rawMonthMeals.at(dayIndex) ?? [];
  const dayReadings = monthReadings.at(dayIndex) ?? [];
  const dayBloodPressure = monthBloodPressure.at(dayIndex) ?? [];
  const dayMovement = monthMovement.at(dayIndex) ?? null;

  const hasData =
    dayMeals.length > 0 ||
    dayReadings.length > 0 ||
    dayBloodPressure.length > 0 ||
    dayMovement !== null;

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
        safeAreaProps={{ edges: ["bottom"] }}
      >
        {hasData ? (
          <>
            <HomeRecentlyLogged
              meals={dayMeals}
              readOnly
              onAddPress={canAdd ? openAddSheet : undefined}
            />
            <View style={styles.summaryStack}>
              <HomeMacroSummary
                totalMacros={dayTotals.macros}
                targets={profile?.targets ?? undefined}
                movement={dayMovement}
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
        ) : canAdd ? (
          <>
            <HomeRecentlyLogged meals={[]} readOnly onAddPress={openAddSheet} />
            <EmptyState body="Записи о питании и показателях за эту дату отсутствуют." />
          </>
        ) : (
          <EmptyState body="Записи о питании и показателях за эту дату отсутствуют. Выберите другой день в календаре." />
        )}
      </ScreenMainScrollView>
      {canAdd && date ? <DayAddMealSheet ref={sheetRef} date={date} /> : null}
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
