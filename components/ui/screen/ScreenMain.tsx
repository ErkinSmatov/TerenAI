import { ComponentProps } from "react";
import SafeArea from "../SafeArea";
import Animated from "react-native-reanimated";
import {
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import WithSkeleton from "../WithSkeleton";
import Text from "../Text";
import getColor from "@/lib/ui/getColor";
import {
  ScreenHeaderProvider,
  useClaimScreenHeader,
} from "./ScreenHeaderContext";

export function ScreenMain({
  children,
  ...props
}: ComponentProps<typeof SafeArea>) {
  return (
    <SafeArea {...props}>
      <ScreenHeaderProvider>{children}</ScreenHeaderProvider>
    </SafeArea>
  );
}

export function ScreenMainScrollView({
  children,
  scrollViewProps,
  safeAreaProps,
}: {
  children: React.ReactNode;
  scrollViewProps?: ScrollViewProps;
  safeAreaProps?: ComponentProps<typeof SafeArea>;
}) {
  const header = useClaimScreenHeader();

  return (
    <Animated.ScrollView
      contentContainerStyle={styles.scrollView}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...scrollViewProps}
    >
      {header}
      <SafeArea {...safeAreaProps}>{children}</SafeArea>
    </Animated.ScrollView>
  );
}

export function ScreenMainTitle({
  title,
  description,
  loading = false,
  style,
}: {
  title?: string;
  description?: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.titleContainer, style]}>
      <WithSkeleton
        loading={loading}
        skeletonStyle={{
          height: 22,
          width: "75%",
          borderRadius: 8,
        }}
      >
        <Text weight="600" style={styles.title}>
          {title}
        </Text>
      </WithSkeleton>
      {description && (
        <Text size="14" color={getColor("mutedForeground")}>
          {description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  titleContainer: {
    paddingBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 22,
  },
});
