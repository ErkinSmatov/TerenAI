import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
} from "@/components/ui/screen/ScreenMain";
import Card from "@/components/ui/Card";
import { api } from "@/convex/_generated/api";
import getLocalMonthBounds from "@/lib/utils/getLocalMonthBounds";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import getColor from "@/lib/ui/getColor";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { Calendar, LocaleConfig as RawLocaleConfig } from "react-native-calendars";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react-native";

// react-native-calendars реэкспортирует тип LocaleConfig из непроверенного
// типами пакета `xdate` (upstream-баг деклараций), из-за чего TS видит
// `error`-тип. Локальный тип восстанавливает реальную форму рантайм-объекта.
type CalendarLocaleConfig = {
  locales: Record<
    string,
    {
      monthNames: string[];
      monthNamesShort: string[];
      dayNames: string[];
      dayNamesShort: string[];
    }
  >;
  defaultLocale: string;
};
const LocaleConfig = RawLocaleConfig as unknown as CalendarLocaleConfig;

// Локаль задаётся один раз на уровне модуля, а не внутри компонента —
// react-native-calendars хранит конфигурацию локалей глобально, повторная
// установка при каждом рендере избыточна и не нужна.
LocaleConfig.locales.ru = {
  monthNames: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  monthNamesShort: [
    "Янв.",
    "Февр.",
    "Март",
    "Апр.",
    "Май",
    "Июнь",
    "Июль",
    "Авг.",
    "Сент.",
    "Окт.",
    "Нояб.",
    "Дек.",
  ],
  // Порядок начинается с воскресенья — так требует сам формат LocaleConfig;
  // за фактическое начало недели (понедельник) отвечает проп firstDay.
  dayNames: [
    "воскресенье",
    "понедельник",
    "вторник",
    "среда",
    "четверг",
    "пятница",
    "суббота",
  ],
  dayNamesShort: ["вс", "пн", "вт", "ср", "чт", "пт", "сб"],
};
LocaleConfig.defaultLocale = "ru";

// Локальная (не UTC) дата сегодняшнего дня в формате YYYY-MM-DD.
// Стандартный ISO-сериализатор Date здесь не используется намеренно: он
// даёт UTC-дату и в отрицательных смещениях часового пояса запретил бы
// выбрать сегодняшний день.
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { scrollY, onScroll } = useScrollY();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());

  const bounds = useMemo(
    () => getLocalMonthBounds(visibleMonth),
    [visibleMonth]
  );

  const monthMeals = useQuery(api.meals.getMonthMeals.default, {
    dayStartsUtc: bounds.dayStartsUtc,
  });

  const markedDates = useMemo(() => {
    if (monthMeals === undefined) return {};

    const marks: Record<string, { marked: boolean; dotColor: string }> = {};
    monthMeals.forEach((dayMeals, index) => {
      if (dayMeals.length > 0) {
        marks[bounds.monthDates[index]] = {
          marked: true,
          dotColor: getColor("mutedForeground", 0.4),
        };
      }
    });
    return marks;
  }, [monthMeals, bounds.monthDates]);

  const maxDate = toLocalDateString(new Date());

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Календарь" />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <Card style={styles.card}>
          <Calendar
            current={toLocalDateString(visibleMonth)}
            firstDay={1}
            maxDate={maxDate}
            enableSwipeMonths
            renderArrow={(direction) =>
              direction === "left" ? (
                <ChevronLeftIcon size={20} color={getColor("foreground")} />
              ) : (
                <ChevronRightIcon size={20} color={getColor("foreground")} />
              )
            }
            markedDates={markedDates}
            onDayPress={({ dateString }) => {
              router.push({
                pathname: "/app/(home)/day/[date]",
                params: { date: dateString },
              });
            }}
            onMonthChange={({ year, month }) => {
              setVisibleMonth(new Date(year, month - 1, 1));
            }}
            theme={{
              calendarBackground: getColor("base"),
              dayTextColor: getColor("foreground"),
              monthTextColor: getColor("foreground"),
              textSectionTitleColor: getColor("mutedForeground"),
              textDisabledColor: getColor("mutedForeground", 0.4),
              selectedDayBackgroundColor: getColor("primary"),
              selectedDayTextColor: getColor("base"),
              todayTextColor: getColor("primary"),
            }}
          />
        </Card>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: "hidden",
  },
});
