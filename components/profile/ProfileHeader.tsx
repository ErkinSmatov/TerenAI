import { View } from "react-native";
import { FlameIcon, UtensilsIcon } from "lucide-react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Text from "../ui/Text";
import getColor from "@/lib/ui/getColor";
import getNutrientGlow from "@/lib/ui/getNutrientGlow";
import { findBadgeDefinition } from "@/lib/badges/badgeDefinitions";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import EditNameSheet from "./EditNameSheet";

// Figma node 858:5164 ("CareAi"). Пользователь явно решил ПРОПУСТИТЬ блок
// уровня/XP-прогресса из макета — в приложении нет системы уровней/опыта,
// только серия (streak) и бейджи. Реализован только блок
// аватар+имя и ряд из 3 последних достижений.
const ACHIEVEMENTS_LIMIT = 3;

// Фон карточки — литеральный фиксированный HEX из Figma (`#0A0D12`), та же
// осознанная конвенция "декоративный figma-цвет, не через getColor()", что и
// у hero-карточек калорий/глюкозы на Главной (см. комментарий в
// `HomeCalorieOverviewCard.tsx`). Совпадает по значению с токеном
// `background` тёмной темы, но задаётся буквально, а не через токен.
const CARD_BACKGROUND_DARK = "#0A0D12";

// Мягкое inset-свечение карточки — литеральный HEX из Figma
// (`inset 0 0 80.5px 0 #73887b`, приглушённый шалфейный тон). Светлая тема
// не имеет референса в Figma — собственный мягкий амбиентный эквивалент той
// же сине-зелёной гаммы на низкой прозрачности (07.1-07-CORRECTION-8).
const CARD_GLOW = {
  dark: "#73887b",
  light: "rgba(115, 136, 123, 0.22)",
};

// Свечение тайлов достижений — литеральный нейтральный серый HEX из Figma
// (`#313131`), НЕ насыщенный цвет (в отличие от нутриент-тайлов Главной).
// Светлая тема — собственный нейтральный амбиентный эквивалент
// (07.1-07-CORRECTION-8).
const ACHIEVEMENT_TILE_GLOW = {
  dark: "#313131",
  light: "rgba(49, 49, 49, 0.14)",
};

export default function ProfileHeader() {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const userName = useQuery(api.home.getCurrentUserName.default);
  const rawUserName = useQuery(api.home.getCurrentUserRawName.default);
  const badges = useQuery(api.badges.listBadges.default);

  const cardGlow = getNutrientGlow(theme, CARD_GLOW.dark, CARD_GLOW.light);

  const latestBadges = badges
    ? [...badges]
        .sort((a, b) => b.earnedAt - a.earnedAt)
        .slice(0, ACHIEVEMENTS_LIMIT)
    : [];

  const initial = (userName ?? "Гость").charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.card,
        cardGlow,
        {
          backgroundColor:
            theme === "dark" ? CARD_BACKGROUND_DARK : getColor("base", undefined, theme),
        },
      ]}
    >
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text
            size="20"
            weight="700"
            color={getColor("background", undefined, theme)}
          >
            {initial}
          </Text>
        </View>
        <Text size="16" weight="600" family="manrope" style={{ flexShrink: 1 }}>
          {userName ?? "Гость"}
        </Text>
        <EditNameSheet currentName={rawUserName ?? null} />
      </View>

      <View style={styles.achievementsRow}>
        {latestBadges.length === 0 ? (
          <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
            Пока нет достижений
          </Text>
        ) : (
          latestBadges.map((badge) => {
            const definition = findBadgeDefinition(badge.type, badge.threshold);
            const Icon = badge.type === "streak" ? FlameIcon : UtensilsIcon;
            const glow = getNutrientGlow(
              theme,
              ACHIEVEMENT_TILE_GLOW.dark,
              ACHIEVEMENT_TILE_GLOW.light
            );

            return (
              <View
                key={`${badge.type}-${badge.threshold}`}
                style={[styles.achievementTile, glow]}
              >
                <Icon
                  size={20}
                  color={getColor("foreground", undefined, theme)}
                />
                <Text
                  size="12"
                  weight="500"
                  style={styles.achievementText}
                  numberOfLines={1}
                >
                  {definition?.name ?? ""}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeName) => ({
  card: {
    borderRadius: 48,
    padding: 20,
    gap: 16,
  },
  profileRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: getColor("primary", undefined, theme),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  achievementsRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  achievementTile: {
    flex: 1,
    backgroundColor: theme === "dark" ? "#15181F" : getColor("base", undefined, theme),
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center" as const,
    gap: 8,
  },
  achievementText: {
    textAlign: "center" as const,
  },
});
