import { TriggerRef } from "@rn-primitives/popover";
import { useRef, useState } from "react";
import * as PopoverPrimitive from "@rn-primitives/popover";
import TabsAddButton from "./TabsAddButton";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
} from "react-native-reanimated";
import Card from "../ui/Card";
import Text from "../ui/Text";
import {
  DropletIcon,
  HeartPulseIcon,
  LucideIcon,
  PenLineIcon,
  ScanIcon,
  StarIcon,
} from "lucide-react-native";
import getColor from "../../lib/ui/getColor";
import Button from "../ui/Button";
import { Href, useRouter } from "expo-router";
import { useRateLimit } from "@convex-dev/rate-limiter/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Toast } from "../ui/Toast";
import ProLabel from "../ProLabel";
import { useSubscriptionContext } from "@/context/SubscriptionContext";

const AnimatedPopoverContent = Animated.createAnimatedComponent(
  PopoverPrimitive.Content
);

// Меню было сжато в маленький фиксированный блок по центру экрана — не на
// всю ширину, как хотел пользователь. Ширина сетки теперь считается от
// реальной ширины экрана (минус внешние отступы), а не от фиксированного
// OPTION_WIDTH — так 2 колонки всегда растягиваются на всю ширину, сколько
// бы ни было карточек (2 или 4).
const GRID_GAP = 16;
const GRID_HORIZONTAL_MARGIN = 16;

const EnterAnimation = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: 30 }, { scale: 0.9 }],
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
    easing: Easing.out(Easing.cubic),
  },
}).duration(200);

const ExitAnimation = new Keyframe({
  0: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
  },
  100: {
    opacity: 0,
    transform: [{ translateY: 30 }, { scale: 0.9 }],
    easing: Easing.in(Easing.cubic),
  },
}).duration(200);

type Option = {
  label: string;
  icon: LucideIcon;
  href: Href;
  isPro: boolean;
  isAiFeature: boolean;
};

const favoritesOption: Option = {
  label: "Избранное",
  icon: StarIcon,
  href: "/app/(add)/favorites",
  isPro: false,
  isAiFeature: false,
};

const baseOptions: Option[] = [
  {
    label: "Описать",
    icon: PenLineIcon,
    href: "/app/(add)/describe",
    isPro: true,
    isAiFeature: true,
  },
  {
    label: "Сканировать",
    icon: ScanIcon,
    href: "/app/(add)/camera",
    isPro: false,
    isAiFeature: true,
  },
  favoritesOption,
];

const glucoseOption: Option = {
  label: "Сахар",
  icon: DropletIcon,
  href: "/app/(add)/glucose",
  isPro: false,
  isAiFeature: false,
};

const bloodPressureOption: Option = {
  label: "Давление",
  icon: HeartPulseIcon,
  href: "/app/(add)/bloodPressure",
  isPro: false,
  isAiFeature: false,
};

export default function TabsAddOptions() {
  const router = useRouter();
  const dimensions = useWindowDimensions();
  // containerWidth — внешняя ширина меню (отступ GRID_HORIZONTAL_MARGIN от
  // каждого края экрана). styles.container добавляет СВОЙ внутренний
  // padding того же размера — поэтому реальная ширина под карточки меньше
  // containerWidth ещё на 2×GRID_HORIZONTAL_MARGIN.
  const containerWidth = dimensions.width - GRID_HORIZONTAL_MARGIN * 2;
  const itemWidth =
    (containerWidth - GRID_HORIZONTAL_MARGIN * 2 - GRID_GAP) / 2;
  const popoverTriggerRef = useRef<TriggerRef>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { hasProAccess, navigateToPaywall } = useSubscriptionContext();
  const { status } = useRateLimit(api.rateLimit.getAiFeaturesRateLimit, {
    getServerTimeMutation: api.rateLimit.getServerTime,
  });
  const profile = useQuery(api.profiles.getProfile.default);

  const options: Option[] =
    profile?.data?.goalTrack === "glucometer"
      ? [...baseOptions, glucoseOption, bloodPressureOption]
      : baseOptions;

  const handleOptionPress = (option: Option) => {
    popoverTriggerRef.current?.close();

    if (!hasProAccess && option.isPro) {
      if (Platform.OS === "android") {
        setTimeout(() => {
          navigateToPaywall();
        }, 200);
      } else {
        navigateToPaywall();
      }
      return;
    }

    if (option.isAiFeature && status && !status.ok) {
      Toast.show({
        text: "Вы достигли дневного лимита функций ИИ.",
        variant: "error",
      });
      return;
    }

    if (Platform.OS === "android") {
      setTimeout(() => {
        router.push(option.href);
      }, 200);
    } else {
      router.push(option.href);
    }
  };

  return (
    <PopoverPrimitive.Root onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild ref={popoverTriggerRef}>
        <TabsAddButton isOpen={isOpen} variant="accent" size="fab" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Overlay style={StyleSheet.absoluteFill}>
          <Animated.View
            style={styles.overlay}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
          />
          <AnimatedPopoverContent
            asChild
            align="center"
            side="top"
            entering={EnterAnimation}
            exiting={ExitAnimation}
          >
            <View style={[styles.container, { width: containerWidth }]}>
              {options.map((option, index) => (
                <Button
                  key={`option-${option.label}-${index}`}
                  variant="base"
                  size="base"
                  style={{ width: itemWidth, position: "relative" }}
                  onPress={() => {
                    handleOptionPress(option);
                  }}
                >
                  {option.isPro && <ProLabel />}
                  <Card style={styles.card}>
                    <option.icon size={28} color={getColor("foreground")} />
                    <Text size="14" weight="500">
                      {option.label}
                    </Text>
                  </Card>
                </Button>
              ))}
            </View>
          </AnimatedPopoverContent>
        </PopoverPrimitive.Overlay>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: GRID_GAP,
    padding: 16,
  },
  card: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
});
