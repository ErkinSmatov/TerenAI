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
import { ScaleIcon, UtensilsIcon } from "lucide-react-native";

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
            text="Напоминание о взвешивании"
            caption="Раз в 7 дней, если вес давно не обновлялся"
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
            caption="Завтрак, обед и ужин — если приём пищи ещё не записан"
            Icon={UtensilsIcon}
            value={profile?.mealRemindersEnabled ?? true}
            onValueChange={(value) => {
              void updateProfile({
                profile: { mealRemindersEnabled: value },
              });
            }}
          />
        </SettingsGroup>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}
