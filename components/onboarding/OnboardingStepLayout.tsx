import { View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Title from "../ui/Title";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { Edge } from "react-native-safe-area-context";
import { ScreenHeader } from "../ui/screen/ScreenHeader";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import { ScreenMainScrollView } from "../ui/screen/ScreenMain";
import SafeArea from "../ui/SafeArea";
import { useEffect } from "react";

type ProgressStepProps = {
  isActive: boolean;
};

function ProgressStep({ isActive }: ProgressStepProps) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0);
  }, [isActive, progress]);

  // "muted", не "secondary" — в тёмной палитре secondary сплошной белый
  // (задуман только для низкой прозрачности); тема передаётся явно в
  // worklet-контексте useAnimatedStyle.
  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [getColor("muted", undefined, theme), getColor("foreground", undefined, theme)]
      ),
    };
  });

  return <Animated.View style={[styles.progressStep, animatedStyle]} />;
}

type Props = {
  children: React.ReactNode;
  sectionName: string;
  numSteps: number;
  currentStep: number;
  showHeader: boolean;
  scrollView: boolean;
};

export default function OnboardingStepLayout({
  children,
  sectionName,
  numSteps,
  currentStep,
  showHeader,
  scrollView,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const contentEdges: Edge[] = showHeader
    ? ["left", "right"]
    : ["top", "left", "right"];
  const { scrollY, onScroll } = useScrollY();

  return (
    <View style={styles.container}>
      {showHeader && (
        <ScreenHeader scrollY={scrollY} safeAreaStyle={styles.headerSafeArea}>
          <View style={styles.headerContainer}>
            <Title size="18">{sectionName}</Title>
            <View style={styles.progressContainer}>
              {Array(numSteps)
                .fill(0)
                .map((_, index) => (
                  <ProgressStep key={index} isActive={index <= currentStep} />
                ))}
            </View>
          </View>
        </ScreenHeader>
      )}
      {scrollView ? (
        <ScreenMainScrollView
          scrollViewProps={{ onScroll }}
          safeAreaProps={{
            edges: contentEdges,
          }}
        >
          {children}
        </ScreenMainScrollView>
      ) : (
        <SafeArea edges={contentEdges}>{children}</SafeArea>
      )}
    </View>
  );
}

const createStyles = (theme: ThemeName) => ({
  container: {
    flex: 1,
  },
  headerSafeArea: {
    paddingBottom: 24,
  },
  headerContainer: {
    flex: 1,
    alignItems: "center" as const,
    gap: 12,
  },
  progressContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
  },
  progressStep: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: getColor("muted", undefined, theme),
  },
});
