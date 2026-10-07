import { TriggerRef } from "@rn-primitives/popover";
import { useRef, useState } from "react";
import * as PopoverPrimitive from "@rn-primitives/popover";
import TabsAddButton from "./TabsAddButton";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
} from "react-native-reanimated";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AddOptionsGrid from "./AddOptionsGrid";
import { getTabAddOptions } from "./addMealOptions";
import { useAddOptionPress } from "./useAddOptionPress";

const AnimatedPopoverContent = Animated.createAnimatedComponent(
  PopoverPrimitive.Content
);

// Меню было сжато в маленький фиксированный блок по центру экрана — не на
// всю ширину, как хотел пользователь. Ширина сетки теперь считается от
// реальной ширины экрана (минус внешние отступы), а не от фиксированного
// OPTION_WIDTH — так 2 колонки всегда растягиваются на всю ширину, сколько
// бы ни было карточек (2 или 4).
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

export default function TabsAddOptions() {
  const dimensions = useWindowDimensions();
  // containerWidth — внешняя ширина меню (отступ GRID_HORIZONTAL_MARGIN от
  // каждого края экрана). AddOptionsGrid добавляет СВОЙ внутренний padding
  // того же размера.
  const containerWidth = dimensions.width - GRID_HORIZONTAL_MARGIN * 2;
  const popoverTriggerRef = useRef<TriggerRef>(null);
  const [isOpen, setIsOpen] = useState(false);
  const press = useAddOptionPress();
  const profile = useQuery(api.profiles.getProfile.default);

  const options = getTabAddOptions(profile?.data?.goalTrack === "glucometer");

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
            <View style={{ width: containerWidth }}>
              <AddOptionsGrid
                options={options}
                width={containerWidth}
                onPress={(option) => {
                  press(option, {
                    beforeNavigate: () => {
                      popoverTriggerRef.current?.close();
                    },
                  });
                }}
              />
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
});
