import BadgeCelebrationModal from "@/components/badges/BadgeCelebrationModal";
import HomeBloodPressureSummary from "@/components/home/HomeBloodPressureSummary";
import HomeDaySelector from "@/components/home/HomeDaySelector";
import HomeGlucoseSummary from "@/components/home/HomeGlucoseSummary";
import HomeHeader from "@/components/home/HomeHeader";
import HomeMacroSummary from "@/components/home/HomeMacroSummary";
import HomeMicroSummary from "@/components/home/HomeMicroSummary";
import HomeMovementSummary from "@/components/home/HomeMovementSummary";
import HomeRecentlyLogged from "@/components/home/HomeRecentlyLogged";
import Carousel from "@/components/ui/Carousel";
import SafeArea from "@/components/ui/SafeArea";
import { api } from "@/convex/_generated/api";
import { useThemeContext } from "@/context/ThemeContext";
import useHealthKitSync from "@/lib/hooks/useHealthKitSync";
import { calculateDayTotals } from "@/lib/nutrition/calculateDayTotals";
import estimateGlucoseFromMeals from "@/lib/nutrition/estimateGlucoseFromMeals";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import getLocalWeekBounds from "@/lib/utils/getLocalWeekBounds";
import { useQuery } from "convex/react";
import { getDay } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

// theme не используется напрямую в стилях — фон зависит только от токена
// `background`, который вычисляется в компоненте через `getColor` и подставляется
// в градиент отдельно; фабрика принимает `theme`, чтобы кэш `useThemedStyles`
// пересобирался при переключении темы, синхронно с градиентом.
const createStyles = (_theme: ThemeName) => ({
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flexGrow: 1,
    paddingBottom: 48,
  },
});

export default function HomeScreen() {
  const dimensions = useWindowDimensions();
  const { theme, isDark } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const [selectedDay, setSelectedDay] = useState((getDay(new Date()) + 6) % 7);

  const profile = useQuery(api.profiles.getProfile.default);
  const isGlucometerTrack = profile?.data?.goalTrack === "glucometer";

  useHealthKitSync(isGlucometerTrack);

  const weekBounds = getLocalWeekBounds();

  const rawWeekMeals = useQuery(api.meals.getWeekMeals.default, {
    dayStartsUtc: weekBounds.dayStartsUtc,
  });
  const weekMeals = rawWeekMeals ?? Array.from({ length: 7 }, () => []);
  const dayMeals = weekMeals.at(selectedDay) ?? [];

  const rawWeekReadings = useQuery(
    api.glucose.getWeekReadings.default,
    isGlucometerTrack ? { dayStartsUtc: weekBounds.dayStartsUtc } : "skip"
  );
  const weekReadings = rawWeekReadings ?? Array.from({ length: 7 }, () => []);
  const dayReadings = weekReadings.at(selectedDay) ?? [];

  const rawWeekBloodPressure = useQuery(
    api.bloodPressure.getWeekReadings.default,
    isGlucometerTrack ? { dayStartsUtc: weekBounds.dayStartsUtc } : "skip"
  );
  const weekBloodPressure =
    rawWeekBloodPressure ?? Array.from({ length: 7 }, () => []);
  const dayBloodPressure = weekBloodPressure.at(selectedDay) ?? [];

  const rawWeekMovement = useQuery(
    api.movement.getWeekMovement.default,
    Platform.OS === "ios" ? { weekDates: weekBounds.weekDates } : "skip"
  );
  const weekMovement = rawWeekMovement ?? Array.from({ length: 7 }, () => null);
  const dayMovement = weekMovement.at(selectedDay) ?? null;

  const weekTotalMacros = weekMeals.map((meals) =>
    meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.totalMacros?.calories ?? 0),
        protein: acc.protein + (meal.totalMacros?.protein ?? 0),
        carbs: acc.carbs + (meal.totalMacros?.carbs ?? 0),
        fat: acc.fat + (meal.totalMacros?.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  );

  const dayTotals = calculateDayTotals(dayMeals);
  // estimateGlucoseFromMeals resolves its target unit/baseline from a 30/14-day
  // reading lookback (GLUCOSE_ESTIMATE_CONSTANTS) — passing only dayReadings
  // starves it of that window on any day without a reading of its own, silently
  // falling back to mmol/L + baseline 5.5. weekReadings.flat() is a partial fix
  // (7 days, not the full 14/30) but covers the common case without adding a
  // dedicated longer-range query just for this estimate.
  const glucoseEstimate = isGlucometerTrack
    ? estimateGlucoseFromMeals(dayMeals, weekReadings.flat(), Date.now())
    : null;

  // Тёмная тема: голубое свечение Figma отмечено как необязательная полировка
  // вне MVP фазы — вместо него плоский фон `background`. Светлая тема
  // сохраняет исходные стопы градиента.
  const gradientColors = isDark
    ? [
        getColor("background", undefined, theme),
        getColor("background", undefined, theme),
      ]
    : [
        getColor("primaryLight", 0.75, theme),
        getColor("background", undefined, theme),
      ];

  return (
    <SafeArea edges={["top"]}>
      <LinearGradient
        colors={gradientColors as [string, string]}
        style={[styles.gradient, { height: dimensions.height * 0.75 }]}
        pointerEvents="none"
      />
      <HomeHeader />
      <ScrollView
        contentContainerStyle={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <HomeDaySelector
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          weekTotalMacros={weekTotalMacros}
        />
        <Carousel showIndicators>
          <HomeMacroSummary totalMacros={dayTotals.macros} />
          <HomeMicroSummary
            totalMicros={dayTotals.micros}
            dayIndex={selectedDay}
          />
        </Carousel>
        <HomeRecentlyLogged meals={dayMeals} />
        {Platform.OS === "ios" && (
          <HomeMovementSummary movement={dayMovement} />
        )}
        {isGlucometerTrack && (
          <HomeGlucoseSummary readings={dayReadings} estimate={glucoseEstimate} />
        )}
        {isGlucometerTrack && (
          <HomeBloodPressureSummary readings={dayBloodPressure} />
        )}
      </ScrollView>
      <BadgeCelebrationModal />
    </SafeArea>
  );
}
