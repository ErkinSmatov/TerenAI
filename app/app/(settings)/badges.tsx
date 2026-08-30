import BadgeTile from "@/components/badges/BadgeTile";
import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
} from "@/components/ui/screen/ScreenMain";
import Text from "@/components/ui/Text";
import { api } from "@/convex/_generated/api";
import { BADGE_DEFINITIONS } from "@/lib/badges/badgeDefinitions";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import getColor from "@/lib/ui/getColor";
import { useQuery } from "convex/react";
import { StyleSheet, View } from "react-native";

export default function BadgesScreen() {
  const { scrollY, onScroll } = useScrollY();
  const earned = useQuery(api.badges.listBadges.default);

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Достижения" />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        {earned?.length === 0 && (
          <View style={styles.emptyState}>
            <Text size="20" weight="600">
              Пока нет достижений
            </Text>
            <Text size="16" color={getColor("mutedForeground")}>
              Записывайте приёмы пищи и держите серию — первый бейдж не за горами
            </Text>
          </View>
        )}

        <View style={styles.grid}>
          {BADGE_DEFINITIONS.map((definition) => {
            const match = earned?.find(
              (badge) =>
                badge.type === definition.type &&
                badge.threshold === definition.threshold
            );

            return (
              <BadgeTile
                key={`${definition.type}-${definition.threshold}`}
                definition={definition}
                earnedAt={match?.earnedAt}
              />
            );
          })}
        </View>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    gap: 4,
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
});
