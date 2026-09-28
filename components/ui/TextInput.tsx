import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import React, { useEffect, useImperativeHandle, useRef } from "react";
import {
  FocusEvent,
  BlurEvent,
  TextInput as RNTextInput,
  Platform,
  TextInputProps,
  Keyboard,
  StyleProp,
  ViewStyle,
  View,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Text from "./Text";
import Card from "./Card";
import Button from "./Button";

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedText = Animated.createAnimatedComponent(Text);

export type TextInputHandle = {
  flashError: () => void;
};

type Props = {
  ref?: React.Ref<TextInputHandle>;
  label?: string;
  suffix?: string;
  containerStyle?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
} & TextInputProps;

export default function TextInput({
  ref,
  label,
  suffix,
  containerStyle,
  cardStyle,
  style,
  pointerEvents,
  ...props
}: Props) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const textInputRef = useRef<RNTextInput>(null);
  const focused = useSharedValue(0);
  const shake = useSharedValue(0);
  const error = useSharedValue(0);

  const handleFocus = (e: FocusEvent) => {
    focused.value = withTiming(1, { duration: 200 });
    props.onFocus?.(e);
  };

  const handleBlur = (e: BlurEvent) => {
    focused.value = withTiming(0, { duration: 200 });
    props.onBlur?.(e);
  };

  useImperativeHandle(
    ref,
    () => ({
      flashError: () => {
        error.value = withSequence(
          withTiming(1, { duration: 200 }),
          withDelay(100, withTiming(0, { duration: 200 }))
        );

        shake.value = withSequence(
          withTiming(8, { duration: 50 }),
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 50 }),
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
      },
    }),
    [error, shake]
  );

  // interpolateColor выполняется в worklet-контексте useAnimatedStyle — тема
  // передаётся явно третьим аргументом getColor (см. lib/ui/getColor.ts).
  const animatedStyles = {
    label: useAnimatedStyle(() => {
      const initialColor = interpolateColor(
        focused.value,
        [0, 1],
        [getColor("mutedForeground", 0.6, theme), getColor("mutedForeground", undefined, theme)]
      );
      const color = interpolateColor(
        error.value,
        [0, 1],
        [initialColor, getColor("red", undefined, theme)]
      );

      return { color };
    }),
    card: useAnimatedStyle(() => {
      const initialBorderColor = interpolateColor(
        focused.value,
        [0, 1],
        [getColor("secondary", undefined, theme), getColor("foreground", undefined, theme)]
      );
      const borderColor = interpolateColor(
        error.value,
        [0, 1],
        [initialBorderColor, getColor("red", undefined, theme)]
      );

      return { borderColor, transform: [{ translateX: shake.value }] };
    }),
  };

  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidHide", () => {
      textInputRef.current?.blur();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <Button
      variant="base"
      size="base"
      onPress={() => textInputRef.current?.focus()}
      style={containerStyle}
    >
      <AnimatedCard style={[styles.card, animatedStyles.card, cardStyle]}>
        {label && (
          <AnimatedText size="12" weight="500" style={animatedStyles.label}>
            {label}
          </AnimatedText>
        )}
        <View
          style={{ flexDirection: "row", alignItems: "center" }}
          pointerEvents={pointerEvents}
        >
          <RNTextInput
            ref={textInputRef}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={getColor("mutedForeground", 0.6, theme)}
            cursorColor={getColor("foreground", undefined, theme)}
            selectionColor={Platform.select({
              ios: getColor("foreground", undefined, theme),
              android: getColor("foreground", 0.2, theme),
            })}
            selectionHandleColor={getColor("foreground", undefined, theme)}
            style={[styles.textInput, style, { flex: 1 }]}
            {...props}
          />
          {suffix && <Text style={[styles.textInput, style]}>{suffix}</Text>}
        </View>
      </AnimatedCard>
    </Button>
  );
}

const createStyles = (theme: ThemeName) => ({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
  textInput: {
    color: getColor("foreground", undefined, theme),
    padding: 0,
    includeFontPadding: false,
    fontSize: 16,
  },
});
