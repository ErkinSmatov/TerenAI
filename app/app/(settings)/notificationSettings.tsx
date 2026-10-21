import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
} from "@/components/ui/screen/ScreenMain";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsToggleItem from "@/components/settings/SettingsToggleItem";
import { api } from "@/convex/_generated/api";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import { useMutation, useQuery } from "convex/react";
import { HeartIcon, ScaleIcon, UtensilsIcon } from "lucide-react-native";

export default function NotificationSettingsScreen() {
  const { scrollY, onScroll } = useScrollY();

  const profile = useQuery(api.profiles.getProfile.default);
  const updateProfile = useMutation(api.profiles.updateProfile.default);

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Уведомления" />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <SettingsGroup>
          <SettingsToggleItem
            text="Еженедельное взвешивание"
            caption="По воскресеньям утром, если вес не вносили 7 дней"
            Icon={ScaleIcon}
            value={profile?.weighInRemindersEnabled ?? true}
            onValueChange={(value) => {
              void updateProfile({
                profile: { weighInRemindersEnabled: value },
              });
            }}
          />
          <SettingsToggleItem
            text="Напоминания о приёмах пищи"
            caption="Если приём пищи не записан к 9:00, 14:00 или 20:00 — не чаще 2 раз в день"
            Icon={UtensilsIcon}
            value={profile?.mealRemindersEnabled ?? true}
            onValueChange={(value) => {
              void updateProfile({
                profile: { mealRemindersEnabled: value },
              });
            }}
          />
          <SettingsToggleItem
            text="Если давно не заходили"
            caption="Короткое сообщение после 3, 7 и 14 дней без входа"
            Icon={HeartIcon}
            value={profile?.retentionRemindersEnabled ?? true}
            onValueChange={(value) => {
              void updateProfile({
                profile: { retentionRemindersEnabled: value },
              });
            }}
          />
        </SettingsGroup>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}
