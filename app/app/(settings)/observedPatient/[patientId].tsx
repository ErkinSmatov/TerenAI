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
import Carousel from "@/components/ui/Carousel";
import Button from "@/components/ui/Button";
import HomeMacroSummary from "@/components/home/HomeMacroSummary";
import HomeMicroSummary from "@/components/home/HomeMicroSummary";
import HomeRecentlyLogged from "@/components/home/HomeRecentlyLogged";
import HomeMovementSummary from "@/components/home/HomeMovementSummary";
import HomeGlucoseSummary from "@/components/home/HomeGlucoseSummary";
import HomeBloodPressureSummary from "@/components/home/HomeBloodPressureSummary";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { calculateDayTotals } from "@/lib/nutrition/calculateDayTotals";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import { useQuery } from "convex/react";
import { useLocalSearchParams, type ErrorBoundaryProps } from "expo-router";
import { getDay } from "date-fns";
import { Platform } from "react-native";

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

export default function ObservedPatientScreen() {
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
        <ScreenMainTitle
          title={data.displayName}
          description="Данные за сегодня. Наблюдателю доступен только текущий день — отсутствие данных за вчера не означает сбой."
        />

        <Carousel showIndicators>
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
        </Carousel>
        <HomeRecentlyLogged meals={data.meals} readOnly />
        {Platform.OS === "ios" && (
          <HomeMovementSummary movement={data.movement} readOnly />
        )}
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
