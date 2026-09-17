import { Dispatch, SetStateAction } from "react";
import { View } from "react-native";
import { addDays, format, getDay, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import Text from "../ui/Text";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import CircularProgress from "../ui/CircularProgress";
import { useDerivedValue } from "react-native-reanimated";
import getShadow from "@/lib/ui/getShadow";
import Button from "../ui/Button";
import macrosToKcal from "@/lib/utils/macrosToKcal";
import calcRatio from "@/lib/utils/calcRatio";
import SafeArea from "../ui/SafeArea";
import { MacrosType } from "@/convex/tables/mealItems";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { profilesConfig } from "@/config/profilesConfig";
import useProgress from "@/lib/hooks/reanimated/useProgress";

type DayData = {
  weekDay: number;
  letter: string;
  number: string;
  carbsRatio: number;
  proteinRatio: number;
  fatRatio: number;
};

type DaySelectorItemProps = {
  day: DayData;
  isSelected: boolean;
  isToday: boolean;
  onPress: () => void;
};

function DaySelectorItem({
  day,
  isSelected,
  isToday,
  onPress,
}: DaySelectorItemProps) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const progress = useProgress();
  const progressCarbs = useDerivedValue(() => day.carbsRatio * progress.value);
  const progressProtein = useDerivedValue(
    () => day.proteinRatio * progress.value
  );
  const progressFat = useDerivedValue(() => day.fatRatio * progress.value);

  return (
    <Button
      variant="base"
      size="base"
      style={[
        styles.dayContainer,
        {
          backgroundColor: isSelected
            ? getColor("primary", undefined, theme)
            : isToday
              ? getColor("primary", 0.15, theme)
              : "transparent",
        },
        isSelected && getShadow("md"),
      ]}
      onPress={onPress}
    >
      <Text
        size="14"
        weight="600"
        style={
          isSelected
            ? { color: getColor("background", undefined, theme) }
            : undefined
        }
      >
        {day.letter}
      </Text>
      <View style={styles.dayProgressContainer}>
        <Text
          family="outfit"
          size="12"
          weight="600"
          style={[
            styles.dayNumberText,
            isSelected
              ? { color: getColor("background", undefined, theme) }
              : undefined,
          ]}
        >
          {day.number}
        </Text>
        <CircularProgress
          progress={[progressCarbs, progressProtein, progressFat]}
          color={[
            getColor("carb", undefined, theme),
            getColor("protein", undefined, theme),
            getColor("fat", undefined, theme),
          ]}
          trackColor={getColor("mutedForeground", 0.2, theme)}
          strokeWidth={3}
        />
      </View>
    </Button>
  );
}

type Props = {
  selectedDay: number;
  setSelectedDay: Dispatch<SetStateAction<number>>;
  weekTotalMacros: MacrosType[];
};

export default function HomeDaySelector({
  selectedDay,
  setSelectedDay,
  weekTotalMacros,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const targets =
    useQuery(api.profiles.getProfile.default)?.targets ??
    profilesConfig.defaultValues.targets;

  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays: DayData[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const calories = Math.max(
      targets.calories,
      macrosToKcal(weekTotalMacros.at(index) ?? {})
    );
    const carbsRatio = calcRatio(
      macrosToKcal({ carbs: weekTotalMacros.at(index)?.carbs }),
      calories
    );
    const proteinRatio = calcRatio(
      macrosToKcal({ protein: weekTotalMacros.at(index)?.protein }),
      calories
    );
    const fatRatio = calcRatio(
      macrosToKcal({ fat: weekTotalMacros.at(index)?.fat }),
      calories
    );

    return {
      weekDay: (getDay(date) + 6) % 7,
      letter: format(date, "EEEEE", { locale: ru }).toUpperCase(),
      number: format(date, "dd", { locale: ru }),
      carbsRatio: isNaN(carbsRatio) ? 0 : carbsRatio,
      proteinRatio: isNaN(proteinRatio) ? 0 : proteinRatio,
      fatRatio: isNaN(fatRatio) ? 0 : fatRatio,
    };
  });

  return (
    <SafeArea edges={["left", "right"]} style={styles.safeArea}>
      {weekDays.map((day) => (
        <DaySelectorItem
          key={`day-${day.weekDay}-${day.number}`}
          day={day}
          isSelected={selectedDay === day.weekDay}
          isToday={day.weekDay === (getDay(new Date()) + 6) % 7}
          onPress={() => {
            setSelectedDay(day.weekDay);
          }}
        />
      ))}
    </SafeArea>
  );
}

const createStyles = (_theme: ThemeName) => ({
  safeArea: {
    flex: 0,
    backgroundColor: "transparent",
    flexDirection: "row" as const,
    gap: 4,
    paddingBottom: 16,
    justifyContent: "space-between" as const,
  },
  dayContainer: {
    alignItems: "center" as const,
    gap: 6,
    flex: 1,
    paddingVertical: 8,
    borderRadius: 24,
    maxWidth: 48,
  },
  dayProgressContainer: {
    width: 34,
    height: 34,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dayNumberText: {
    position: "absolute" as const,
  },
});
