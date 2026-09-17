import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableProps, View } from "react-native";
import Button from "../ui/Button";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import { PlusIcon } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

type Props = PressableProps & {
  isOpen?: boolean;
  variant?: "primary" | "accent";
  size?: "fab";
};

export default function TabsAddButton({
  isOpen,
  variant = "accent",
  size = "fab",
  ...pressableProps
}: Props) {
  const { bottom } = useSafeAreaInsets();
  const { theme } = useThemeContext();
  const topOffset = -16 - Math.max(0, bottom / 2 - 10);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: withTiming(isOpen ? "45deg" : "0deg", { duration: 200 }) },
      ],
    };
  });

  return (
    <View
      pointerEvents="box-none"
      style={{ flex: 1, alignItems: "center", top: topOffset }}
    >
      <Button
        variant={variant}
        size={size}
        hitSlop={10}
        accessibilityLabel="Добавить"
        {...pressableProps}
      >
        <Animated.View style={animatedStyle}>
          <PlusIcon color={getColor("background", undefined, theme)} size={28} />
        </Animated.View>
      </Button>
    </View>
  );
}
