import { ScrollView, View } from "react-native";
import { format } from "date-fns";
import { Image } from "expo-image";
import { useQuery } from "convex/react";
import { useDerivedValue } from "react-native-reanimated";
import {
  DropletIcon,
  UtensilsCrossedIcon,
} from "lucide-react-native";
import Text from "../ui/Text";
import CarbIcon from "../icons/macros/CarbIcon";
import ProteinIcon from "../icons/macros/ProteinIcon";
import Card from "../ui/Card";
import Button from "../ui/Button";
import CircularProgress from "../ui/CircularProgress";
import { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { Link } from "expo-router";
import WithSkeleton from "../ui/WithSkeleton";
import SafeArea from "../ui/SafeArea";
import HomeEmptyState from "./HomeEmptyState";
import calcRatio from "@/lib/utils/calcRatio";
import macrosToKcal from "@/lib/utils/macrosToKcal";
import useProgress from "@/lib/hooks/reanimated/useProgress";
import { profilesConfig } from "@/config/profilesConfig";

// getWeekMeals (Главная) резолвит `photoStorageId` в реальный `photoUrl`.
// Месячный запрос Дневника (`app/(home)/day/[date].tsx`, вне скоупа этой
// волны) пока этого не делает — его блюда приходят без этого поля, и карточки
// просто показывают fallback-иконку до отдельной будущей волны. `photoUrl`
// поэтому строго опционален, чтобы оба источника блюд удовлетворяли тип.
type MealWithOptionalPhoto = Doc<"meals"> & { photoUrl?: string | null };

const THUMBNAIL_SIZE = 60;
const THUMBNAIL_RING_GAP = 4;
const THUMBNAIL_RING_SIZE = THUMBNAIL_SIZE + THUMBNAIL_RING_GAP * 2;

type ThumbnailProps = {
  meal: MealWithOptionalPhoto;
  targetCalories: number;
};

// Кольцо вокруг миниатюры — НЕ декоративная фиксированная дуга: это тот же
// реальный, управляемый данными 3-сегментный `CircularProgress`, что и у
// селектора дня (`HomeDaySelector.tsx`), только сегменты считаются для
// ЭТОГО конкретного блюда, а не для итогов дня. Знаменатель — дневная цель
// по калориям (`targetCalories`), намеренно тот же паттерн, что и в
// `HomeDaySelector`/`HomeMacroSummary` — не собственная цель на блюдо,
// которой в проекте не существует.
function MealThumbnail({ meal, targetCalories }: ThumbnailProps) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const progress = useProgress();

  const carbsRatio = calcRatio(
    macrosToKcal({ carbs: meal.totalMacros?.carbs }),
    targetCalories
  );
  const proteinRatio = calcRatio(
    macrosToKcal({ protein: meal.totalMacros?.protein }),
    targetCalories
  );
  const fatRatio = calcRatio(
    macrosToKcal({ fat: meal.totalMacros?.fat }),
    targetCalories
  );

  const progressCarbs = useDerivedValue(() => carbsRatio * progress.value);
  const progressProtein = useDerivedValue(
    () => proteinRatio * progress.value
  );
  const progressFat = useDerivedValue(() => fatRatio * progress.value);

  return (
    <View style={styles.thumbnailContainer}>
      <CircularProgress
        size={THUMBNAIL_RING_SIZE}
        progress={[progressCarbs, progressProtein, progressFat]}
        color={[
          getColor("carb", undefined, theme),
          getColor("protein", undefined, theme),
          getColor("fat", undefined, theme),
        ]}
        trackColor={getColor("mutedForeground", 0.2, theme)}
        strokeWidth={3}
      />
      <View style={styles.thumbnailInner}>
        {meal.photoUrl ? (
          <Image
            source={{ uri: meal.photoUrl }}
            style={styles.thumbnailImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.thumbnailFallback}>
            <UtensilsCrossedIcon
              size={24}
              color={getColor("mutedForeground", 0.6, theme)}
            />
          </View>
        )}
      </View>
    </View>
  );
}

type CardProps = {
  meal: MealWithOptionalPhoto;
  readOnly?: boolean;
  targetCalories: number;
};

function MealCard({ meal, readOnly = false, targetCalories }: CardProps) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  const macros = [
    { value: meal.totalMacros?.protein, Icon: ProteinIcon },
    { value: meal.totalMacros?.carbs, Icon: CarbIcon },
  ];

  const isLoading = meal.status !== "done";

  const cardContent = (
    <Card style={styles.itemCard}>
      <View style={styles.thumbnailRow}>
        <MealThumbnail meal={meal} targetCalories={targetCalories} />
        <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
          {format(meal._creationTime, "HH:mm")}
        </Text>
      </View>
      <WithSkeleton
        loading={isLoading}
        containerStyle={{ alignSelf: "stretch" }}
        skeletonStyle={{ height: 14, width: "100%" }}
      >
        <Text size="12" weight="600" numberOfLines={2} style={styles.itemName}>
          {meal.name ?? "Блюдо без названия"}
        </Text>
      </WithSkeleton>
      <View style={styles.itemMacrosRow}>
        {macros.map(({ value, Icon }, index) => (
          <View key={`macro-${index}`} style={styles.itemMacroContainer}>
            <Icon size={14} strokeWidth={2.25} />
            <WithSkeleton
              loading={isLoading}
              skeletonStyle={{ height: 12, width: "100%" }}
            >
              <Text size="12" weight="600" family="outfit">
                {Math.round(value ?? 0)}
              </Text>
            </WithSkeleton>
          </View>
        ))}
        <View style={styles.itemMacroContainer}>
          <DropletIcon
            size={14}
            strokeWidth={2.25}
            color={getColor("fat", undefined, theme)}
          />
          <WithSkeleton
            loading={isLoading}
            skeletonStyle={{ height: 12, width: "100%" }}
          >
            <Text size="12" weight="600" family="outfit">
              {Math.round(meal.totalMacros?.fat ?? 0)}
            </Text>
          </WithSkeleton>
        </View>
      </View>
    </Card>
  );

  if (readOnly) {
    return cardContent;
  }

  return (
    <Link
      href={{ pathname: "/app/(meal)/meal", params: { mealId: meal._id } }}
      asChild
    >
      <Button variant="base" size="base">
        {cardContent}
      </Button>
    </Link>
  );
}

type Props = {
  meals: MealWithOptionalPhoto[];
  readOnly?: boolean;
};

export default function HomeRecentlyLogged({ meals, readOnly = false }: Props) {
  const styles = useThemedStyles(createStyles);

  const targetCalories =
    useQuery(api.profiles.getProfile.default)?.targets.calories ??
    profilesConfig.defaultValues.targets.calories;

  return (
    <SafeArea edges={["left", "right"]} style={styles.safeArea}>
      <Text size="20" weight="600" style={styles.title}>
        Рацион
      </Text>
      {meals.length === 0 ? (
        <HomeEmptyState
          text="Добавьте блюда, чтобы увидеть их здесь…"
          href="/app/(add)/describe"
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.itemsContainer}
        >
          {meals.map((meal, index) => (
            <MealCard
              key={`log-item-${index}-${meal.name}`}
              meal={meal}
              readOnly={readOnly}
              targetCalories={targetCalories}
            />
          ))}
        </ScrollView>
      )}
    </SafeArea>
  );
}

const createStyles = (theme: ThemeName) => ({
  safeArea: {
    flex: 0,
    backgroundColor: "transparent",
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    paddingBottom: 16,
  },
  itemsContainer: {
    gap: 12,
  },
  itemCard: {
    width: 169,
    minHeight: 160,
    gap: 12,
  },
  thumbnailRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  thumbnailContainer: {
    width: THUMBNAIL_RING_SIZE,
    height: THUMBNAIL_RING_SIZE,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  thumbnailInner: {
    position: "absolute" as const,
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: THUMBNAIL_SIZE / 2,
    overflow: "hidden" as const,
    backgroundColor: getColor("base", undefined, theme),
  },
  thumbnailImage: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  thumbnailFallback: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  itemName: {
    flexShrink: 1,
  },
  itemMacrosRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginTop: "auto" as const,
  },
  itemMacroContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
});
