import SafeArea from "../SafeArea";
import { StyleSheet, View, ViewStyle } from "react-native";
import Button from "../Button";
import {
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  LucideIcon,
} from "lucide-react-native";
import Text from "../Text";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import Popover, { PopoverOption } from "../Popover";
import { ComponentProps } from "react";
import { SharedValue } from "react-native-reanimated";
import { useRegisterScreenHeader } from "./ScreenHeaderContext";

// Шапка не фиксируется: ScreenMainScrollView выводит её внутри прокрутки.
// `scrollY` оставлен в типе только для совместимости со старыми вызовами.
export function ScreenHeader({
  children,
  safeAreaStyle,
}: {
  children: React.ReactNode;
  scrollY?: SharedValue<number>;
  safeAreaStyle?: ViewStyle;
}) {
  const node = (
    <SafeArea
      edges={["top", "left", "right"]}
      style={[styles.safeArea, safeAreaStyle]}
    >
      <View style={styles.container}>{children}</View>
    </SafeArea>
  );

  const isRegistered = useRegisterScreenHeader(node);

  return isRegistered ? null : node;
}

export function ScreenHeaderButton({
  Icon,
  ...buttonProps
}: {
  Icon: LucideIcon;
} & ComponentProps<typeof Button>) {
  const { theme } = useThemeContext();

  return (
    <Button
      size="sm"
      variant="secondary"
      style={styles.button}
      {...buttonProps}
    >
      <Icon size={22} color={getColor("foreground", undefined, theme)} />
    </Button>
  );
}

export function ScreenHeaderTitle({ title }: { title: string }) {
  return (
    <View style={styles.title}>
      <Text size="18" weight="600">
        {title}
      </Text>
    </View>
  );
}

export function ScreenHeaderBackButton() {
  const router = useRouter();

  return (
    <ScreenHeaderButton
      Icon={ArrowLeftIcon}
      onPress={() => {
        router.back();
      }}
    />
  );
}

export function ScreenHeaderActions({ options }: { options: PopoverOption[] }) {
  return (
    <Popover
      trigger={<ScreenHeaderButton Icon={EllipsisVerticalIcon} />}
      options={options}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 0,
    zIndex: 10,
    paddingBottom: 16,
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  button: {
    aspectRatio: 1,
  },
  title: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
