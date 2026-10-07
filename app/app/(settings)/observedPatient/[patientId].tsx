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
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import Text from "@/components/ui/Text";
import HomeMacroSummary from "@/components/home/HomeMacroSummary";
import HomeMicroSummary from "@/components/home/HomeMicroSummary";
import HomeRecentlyLogged from "@/components/home/HomeRecentlyLogged";
import HomeGlucoseSummary from "@/components/home/HomeGlucoseSummary";
import HomeBloodPressureSummary from "@/components/home/HomeBloodPressureSummary";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { calculateDayTotals } from "@/lib/nutrition/calculateDayTotals";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import { useQuery } from "convex/react";
import { useLocalSearchParams, type ErrorBoundaryProps } from "expo-router";
import { getDay } from "date-fns";
import { StyleSheet, View } from "react-native";
import { FlameIcon } from "lucide-react-native";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";

/**
 * Экспорт с именем ErrorBoundary — соглашение expo-router: файл маршрута
 * может экспортировать компонент-обработчик ошибок, который перехватывает
 * исключения, брошенные во время рендера этого маршрута (включая throw из
 * useQuery, когда сервер отвечает ошибкой). Если наблюдение отозвано, пока
 * экран открыт, getPatientToday начинает бросать "Forbidden" — этот
 * компонент показывает объяснение вместо белого экрана краша.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <ScreenMain edges={[]}>
      <ScreenHeader>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Доступ недоступен" />
      </ScreenHeader>
      <ScreenMainScrollView
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <ScreenMainTitle
          title="Доступ к данным этого пациента больше не предоставлен"
          description="Пациент мог отозвать доступ. Чтобы увидеть данные снова, попросите его поделиться кодом ещё раз."
        />
        <Button variant="secondary" size="base" onPress={() => void retry()}>
          Повторить
        </Button>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  titleText: {
    flex: 1,
  },
  streakPill: {
    minWidth: 56,
  },
  summaryStack: {
    gap: 18,
  },
});

export default function ObservedPatientScreen() {
  const { theme } = useThemeContext();
  const { patientId } = useLocalSearchParams<{ patientId: Id<"users"> }>();
  const { scrollY, onScroll } = useScrollY();

  const data = useQuery(api.observers.getPatientToday.default, {
    patientId,
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
  });

  if (data === undefined) {
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

  const dayTotals = calculateDayTotals(data.meals);
  const dayIndex = (getDay(new Date()) + 6) % 7;

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title={data.displayName} />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <ScreenMainTitle
              title={data.displayName}
              description="Данные за сегодня. Наблюдателю доступен только текущий день — отсутствие данных за вчера не означает сбой."
              style={{ paddingBottom: 0 }}
            />
          </View>
          <Pill style={styles.streakPill}>
            <FlameIcon
              size={20}
              color={getColor("orange", undefined, theme)}
              fill={getColor("orange", undefined, theme)}
            />
            <Text family="outfit" weight="600">
              {data.streak}
            </Text>
          </Pill>
        </View>

        <HomeRecentlyLogged meals={data.meals} readOnly />
        <View style={styles.summaryStack}>
          <HomeMacroSummary
            totalMacros={dayTotals.macros}
            targets={data.targets ?? undefined}
            readOnly
          />
          <HomeMicroSummary
            totalMicros={dayTotals.micros}
            dayIndex={dayIndex}
            readOnly
          />
        </View>
        {data.isGlucometerTrack && (
          <HomeGlucoseSummary readings={data.glucoseReadings} readOnly />
        )}
        {data.isGlucometerTrack && (
          <HomeBloodPressureSummary
            readings={data.bloodPressureReadings}
            readOnly
          />
        )}
      </ScreenMainScrollView>
    </ScreenMain>
  );
}
