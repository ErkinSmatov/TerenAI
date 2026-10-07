import { View } from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { resolveAddDate } from "@/lib/utils/parseLocalDate";
import { StarIcon, TrashIcon } from "lucide-react-native";
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
import SafeArea from "@/components/ui/SafeArea";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";
import AlertDialog from "@/components/ui/AlertDialog";
import { Toast } from "@/components/ui/Toast";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import tryCatch from "@/lib/utils/tryCatch";
import logError from "@/lib/utils/logError";

export default function FavoritesScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const addDate = resolveAddDate(date, Date.now());
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const { scrollY, onScroll } = useScrollY();
  const favorites = useQuery(api.favorites.listFavorites.default);
  const removeFavorite = useMutation(api.favorites.removeFavorite.default);

  const handleRemove = async (favoriteId: Id<"favoriteMeals">) => {
    const { error } = await tryCatch(removeFavorite({ favoriteId }));
    if (error) {
      logError("Remove favorite error", error);
      Toast.show({ text: "Не удалось удалить блюдо", variant: "error" });
    }
  };

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Избранное" />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right"] }}
      >
        {favorites === undefined ? (
          <ScreenMainTitle loading />
        ) : favorites.length === 0 ? (
          <View style={styles.empty}>
            <StarIcon
              size={40}
              color={getColor("mutedForeground", 0.5, theme)}
            />
            <Text size="18" weight="600" style={styles.centerText}>
              Пока нет избранных блюд
            </Text>
            <Text
              size="14"
              color={getColor("mutedForeground", 0.5, theme)}
              style={styles.centerText}
            >
              Откройте распознанное блюдо и нажмите звёздочку, чтобы сохранить
              его здесь.
            </Text>
          </View>
        ) : (
          <SafeArea edges={[]} style={styles.list}>
            {favorites.map((favorite) => (
              <Button
                key={favorite._id}
                variant="base"
                size="base"
                onPress={() => {
                  router.replace({
                    pathname: "/app/(meal)/confirm-meal",
                    params: {
                      favoriteId: favorite._id,
                      ...(addDate ? { date: addDate.date } : {}),
                    },
                  });
                }}
              >
                <Card style={styles.card}>
                  {favorite.photoUrl ? (
                    <Image
                      source={{ uri: favorite.photoUrl }}
                      style={styles.photo}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]}>
                      <StarIcon
                        size={24}
                        color={getColor("mutedForeground", 0.5, theme)}
                      />
                    </View>
                  )}
                  <View style={styles.info}>
                    <Text size="16" weight="600" numberOfLines={1}>
                      {favorite.name}
                    </Text>
                    <Text
                      size="14"
                      color={getColor("mutedForeground", undefined, theme)}
                      numberOfLines={2}
                    >
                      {favorite.items
                        .map((i) => `${i.nameRu ?? i.name} · ${i.grams} г`)
                        .join(", ")}
                    </Text>
                  </View>
                  <AlertDialog
                    trigger={
                      <Button variant="secondary" size="sm">
                        <TrashIcon
                          size={20}
                          color={getColor("foreground", undefined, theme)}
                        />
                      </Button>
                    }
                    title="Удалить из избранного?"
                    description="Блюдо исчезнет из списка. Уже записанные приёмы пищи не изменятся."
                    destructive
                    onConfirm={() => {
                      void handleRemove(favorite._id);
                    }}
                  />
                </Card>
              </Button>
            ))}
          </SafeArea>
        )}
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const createStyles = (_theme: ThemeName) => ({
  empty: {
    alignItems: "center" as const,
    paddingTop: 64,
    paddingHorizontal: 16,
    gap: 12,
  },
  centerText: {
    textAlign: "center" as const,
  },
  list: {
    flex: 0,
    gap: 12,
  },
  card: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  photoPlaceholder: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  info: {
    flex: 1,
    gap: 2,
  },
});
