import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { api } from "@/convex/_generated/api";
import { findBadgeDefinition } from "@/lib/badges/badgeDefinitions";
import getColor from "@/lib/ui/getColor";
import { Portal } from "@rn-primitives/portal";
import { useMutation, useQuery } from "convex/react";
import { TrophyIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Source: components/ui/AlertDialog.tsx — тот же Keyframe по 200мс, чтобы не
// изобретать новую кривую анимации для второй модалки в приложении.
const ZoomIn = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ scale: 0.9 }],
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.out(Easing.cubic),
  },
}).duration(200);

const ZoomOut = new Keyframe({
  0: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  100: {
    opacity: 0,
    transform: [{ scale: 0.9 }],
    easing: Easing.in(Easing.cubic),
  },
}).duration(200);

/**
 * Самодостаточная модалка празднования нового бейджа. Не принимает пропсов —
 * сама решает, показываться ли, на основе реактивного `getUnseenBadge`.
 * Это единственный источник истины: бейдж может быть начислен фоновым
 * `internalAction`, когда пользователь уже ушёл с экрана подтверждения блюда
 * (69-RESEARCH.md Pitfall 3), поэтому показ не может зависеть от колбэка
 * мутации подтверждения.
 */
export default function BadgeCelebrationModal() {
  const dimensions = useWindowDimensions();
  const unseenBadge = useQuery(api.badges.getUnseenBadge.default);
  const markBadgeSeen = useMutation(api.badges.markBadgeSeen.default);
  const [visible, setVisible] = useState(false);

  const definition = unseenBadge
    ? findBadgeDefinition(unseenBadge.type, unseenBadge.threshold)
    : undefined;

  const iconScale = useSharedValue(0);

  useEffect(() => {
    if (!unseenBadge) return;

    if (!definition) {
      // Порог удалён из кода после выдачи бейджа — не падаем, просто
      // отмечаем показанным и не показываем модалку.
      void markBadgeSeen({ badgeId: unseenBadge._id });
      return;
    }

    setVisible(true);
    iconScale.value = 0;
    iconScale.value = withSpring(1, { damping: 12, stiffness: 180 });
  }, [unseenBadge, definition, markBadgeSeen, iconScale]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!unseenBadge || !definition || !visible) return null;

  const handleClose = () => {
    setVisible(false);
    void markBadgeSeen({ badgeId: unseenBadge._id });
  };

  return (
    <Portal name="badge-celebration">
      <Animated.View style={styles.overlay}>
        <AnimatedPressable
          style={styles.overlayPressable}
          onPress={handleClose}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
        />
        <Animated.View entering={ZoomIn} exiting={ZoomOut}>
          <Card style={[styles.card, { width: dimensions.width - 32 }]}>
            <Animated.View style={[styles.iconCircle, iconAnimatedStyle]}>
              <TrophyIcon size={48} color={getColor("base")} />
            </Animated.View>
            <Text size="20" weight="600" style={styles.title}>
              Новое достижение!
            </Text>
            <Text
              size="16"
              color={getColor("mutedForeground")}
              style={styles.description}
            >
              {`${definition.name} — ${definition.description}`}
            </Text>
            <Button variant="primary" onPress={handleClose}>
              Круто
            </Button>
          </Card>
        </Animated.View>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayPressable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  card: {
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: getColor("orange"),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    marginBottom: 32,
    textAlign: "center",
  },
  description: {
    marginBottom: 32,
    textAlign: "center",
  },
});
