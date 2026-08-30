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
import useHealthKitSync from "@/lib/hooks/useHealthKitSync";
import { calculateDayTotals } from "@/lib/nutrition/calculateDayTotals";
import estimateGlucoseFromMeals from "@/lib/nutrition/estimateGlucoseFromMeals";
import getColor from "@/lib/ui/getColor";
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

export default function HomeScreen() {
  const dimensions = useWindowDimensions();
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

  return (
    <SafeArea edges={["top"]}>
      <LinearGradient
        colors={[getColor("primaryLight", 0.75), getColor("background")]}
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

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});
