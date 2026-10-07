import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { XIcon } from "lucide-react-native";
import { Link } from "expo-router";
import Text from "../ui/Text";
import SportShoeIcon from "../icons/SportShoeIcon";
import {
  CARD_BACKGROUND_DARK,
  CARD_GLOW,
  CARD_GLOW_ALERT,
} from "./observerCardTheme";
import Button from "../ui/Button";
import AlertDialog from "../ui/AlertDialog";
import WarningBadge from "../ui/WarningBadge";
import { Id } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import getNutrientGlow from "@/lib/ui/getNutrientGlow";
import { useThemeContext } from "@/context/ThemeContext";
import { GlucoseContext, GlucoseUnit } from "@/config/glucoseConfig";

export type ObservedPatient = {
  patientId: Id<"users">;
  linkId: Id<"observerLinks">;
  displayName: string;
  mealsCount: number;
  caloriesTotal: number;
  caloriesTarget: number | null;
  isCaloriesExceeded: boolean;
  latestGlucose: {
    value: number;
    unit: GlucoseUnit;
    context?: GlucoseContext;
    recordedAt: number;
  } | null;
  isGlucoseOutOfRange: boolean;
  steps: number | null;
  distanceMeters: number | null;
  isGlucometerTrack: boolean;
};

// Цель по шагам — та же фиксированная 10000, что у полоски активности в
// карточке калорий на Главной (`HomeCalorieOverviewCard.tsx`).
const STEPS_GOAL = 10000;
const STEPS_FILL_GRADIENT: [string, string] = ["#C9F14C", "#F7F1E3"];
const AVATAR_GRADIENT: [string, string] = ["#D3F04E", "#A9DE5A"];
const MUTED_ON_DARK = "#7C7D7F";
const PROGRESS_DOTS = 8;

type Props = {
  patient: ObservedPatient;
  onRemove: () => void;
};

export default function ObservedPatientCard({ patient, onRemove }: Props) {
  const { theme } = useThemeContext();

  const isAlert = patient.isCaloriesExceeded || patient.isGlucoseOutOfRange;
  const glow = isAlert ? CARD_GLOW_ALERT : CARD_GLOW;

  const stepsRatio = Math.min(1, Math.max(0, (patient.steps ?? 0) / STEPS_GOAL));
  const distanceKm =
    typeof patient.distanceMeters === "number"
      ? Math.round(patient.distanceMeters / 1000)
      : null;

  const glucoseValue = patient.latestGlucose
    ? String(patient.latestGlucose.value)
    : "—";

  const initials = patient.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const labelColor = getColor("foreground", 0.65, theme);
  const trackColor = getColor("foreground", 0.3, theme);

  const cardContent = (
    <View
      style={[
        styles.card,
        {
          backgroundColor:
            theme === "dark"
              ? CARD_BACKGROUND_DARK
              : getColor("base", undefined, theme),
        },
        getNutrientGlow(theme, glow.dark, glow.light),
      ]}
    >
      <View style={styles.header}>
        <LinearGradient
          colors={AVATAR_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text size="24" weight="600" color="#0A0E13">
            {initials}
          </Text>
        </LinearGradient>
        <Text size="16" weight="600" style={styles.name} numberOfLines={1}>
          {patient.displayName}
        </Text>
        <AlertDialog
          trigger={
            <Button
              variant="base"
              size="base"
              style={styles.removeButton}
              accessibilityLabel="Убрать из списка наблюдаемых"
            >
              <XIcon
                size={18}
                color={getColor("mutedForeground", undefined, theme)}
              />
            </Button>
          }
          destructive
          title="Убрать из списка наблюдаемых"
          description="Вы перестанете видеть данные этого пациента. Чтобы возобновить доступ, потребуется новый код."
          onConfirm={onRemove}
        />
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.sideColumn}>
          <Text size="12" color={labelColor}>
            Калорий
          </Text>
          <Text size="20" weight="600" family="outfit">
            {String(patient.caloriesTotal)}
          </Text>
        </View>

        <View style={styles.activityColumn}>
          <View style={styles.activityHeader}>
            <View style={styles.activityLeft}>
              <Text size="12" weight="600" family="outfit">
                {typeof patient.steps === "number"
                  ? patient.steps.toLocaleString("ru-RU")
                  : "—"}
              </Text>
            </View>
            <SportShoeIcon
              size={20}
              color={getColor("foreground", undefined, theme)}
            />
            <View style={styles.activityRight}>
              <Text size="12" family="outfit" color={MUTED_ON_DARK}>
                {distanceKm === null ? "—" : `${distanceKm} км`}
              </Text>
            </View>
          </View>
          <View style={[styles.track, { backgroundColor: trackColor }]}>
            <LinearGradient
              colors={STEPS_FILL_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${stepsRatio * 100}%` }]}
            />
            <View style={styles.dots} pointerEvents="none">
              {Array.from({ length: PROGRESS_DOTS }).map((_, index) => (
                <View key={`dot-${index}`} style={styles.dot} />
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.sideColumn, styles.sideColumnRight]}>
          <Text size="12" color={labelColor}>
            Глюкоза
          </Text>
          <Text size="20" weight="600" family="outfit">
            {glucoseValue}
          </Text>
        </View>
      </View>

      {isAlert && (
        <View style={styles.badgeRow}>
          {patient.isCaloriesExceeded && (
            <WarningBadge text="Превышены калории" color="amber" />
          )}
          {patient.isGlucoseOutOfRange && (
            <WarningBadge text="Глюкоза вне нормы" color="red" />
          )}
        </View>
      )}
    </View>
  );

  return (
    <Link
      href={{
        pathname: "/app/(settings)/observedPatient/[patientId]",
        params: { patientId: patient.patientId },
      }}
      asChild
    >
      <Button variant="base" size="base">
        {cardContent}
      </Button>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    flex: 1,
  },
  removeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sideColumn: {
    minWidth: 56,
    gap: 4,
  },
  sideColumnRight: {
    alignItems: "flex-end",
  },
  activityColumn: {
    flex: 1,
    gap: 6,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  activityRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  track: {
    height: 9,
    borderRadius: 5,
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 2,
    height: 5,
    borderRadius: 3,
  },
  dots: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#C9F14C",
    opacity: 0.8,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
