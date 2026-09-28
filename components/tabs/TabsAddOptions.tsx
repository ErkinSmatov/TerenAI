import { TriggerRef } from "@rn-primitives/popover";
import { useRef, useState } from "react";
import * as PopoverPrimitive from "@rn-primitives/popover";
import TabsAddButton from "./TabsAddButton";
import { Platform, StyleSheet, View } from "react-native";
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

// Фиксированная ширина карточки опции — 2 в ряд с gap 16 (см. styles.container)
// вместо flex:1 в один ряд, чтобы получить сетку 2×2 вместо горизонтального ряда.
const OPTION_WIDTH = 110;

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
            <View style={styles.container}>
              {options.map((option, index) => (
                <Button
                  key={`option-${option.label}-${index}`}
                  variant="base"
                  size="base"
                  style={{ width: OPTION_WIDTH, position: "relative" }}
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
    gap: 16,
    padding: 16,
    width: OPTION_WIDTH * 2 + 16 + 32,
  },
  card: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
});
