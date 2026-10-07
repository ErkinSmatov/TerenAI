import type { ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import { format } from "date-fns";
import {
  DropletIcon,
  FlameIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react-native";
import { Link } from "expo-router";
import Text from "../ui/Text";
import SportShoeIcon from "../icons/SportShoeIcon";
import {
  CARD_BACKGROUND_DARK,
  CARD_GLOW,
  TILE_BACKGROUND_DARK,
  TILE_GLOW,
} from "./observerCardTheme";
import Button from "../ui/Button";
import AlertDialog from "../ui/AlertDialog";
import WarningBadge from "../ui/WarningBadge";
import { Id } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import getNutrientGlow from "@/lib/ui/getNutrientGlow";
import { useThemeContext } from "@/context/ThemeContext";
import {
  glucoseContextLabels,
  GlucoseContext,
  GlucoseUnit,
} from "@/config/glucoseConfig";

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
  isGlucometerTrack: boolean;
};

type StatProps = {
  Icon: ComponentType<{ size?: number; color?: string }>;
  value: string;
  label: string;
};

function Stat({ Icon, value, label }: StatProps) {
  const { theme } = useThemeContext();

  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor:
            theme === "dark"
              ? TILE_BACKGROUND_DARK
              : getColor("base", undefined, theme),
        },
        getNutrientGlow(theme, TILE_GLOW.dark, TILE_GLOW.light),
      ]}
    >
      <Icon size={20} color={getColor("foreground", undefined, theme)} />
      <Text
        size="16"
        weight="600"
        family="outfit"
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        size="12"
        color={getColor("foreground", 0.6, theme)}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

type Props = {
  patient: ObservedPatient;
  onRemove: () => void;
};

export default function ObservedPatientCard({ patient, onRemove }: Props) {
  const { theme } = useThemeContext();

  const caloriesLabel =
    patient.caloriesTarget !== null
      ? `ккал из ${patient.caloriesTarget}`
      : "ккал";

  const glucoseValue = patient.latestGlucose
    ? `${patient.latestGlucose.value} ${patient.latestGlucose.unit}`
    : "—";
  const glucoseLabel = patient.latestGlucose
    ? (patient.latestGlucose.context
        ? glucoseContextLabels[patient.latestGlucose.context]
        : format(patient.latestGlucose.recordedAt, "HH:mm"))
    : "нет замеров";

  const initial = patient.displayName.charAt(0).toUpperCase();

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
        getNutrientGlow(theme, CARD_GLOW.dark, CARD_GLOW.light),
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: getColor("primary", undefined, theme) },
          ]}
        >
          <Text
            size="20"
            weight="600"
            color={getColor("background", undefined, theme)}
          >
            {initial}
          </Text>
        </View>
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
        {/* «—» только для nullable-полей (steps, latestGlucose);
            caloriesTotal/mealsCount всегда числа — 0 это данные. */}
        <Stat
          Icon={FlameIcon}
          value={String(patient.caloriesTotal)}
          label={caloriesLabel}
        />
        <Stat
          Icon={SportShoeIcon}
          value={
            patient.steps === null ? "—" : patient.steps.toLocaleString("ru-RU")
          }
          label="шаги"
        />
        <Stat
          Icon={UtensilsIcon}
          value={String(patient.mealsCount)}
          label="приёмов пищи"
        />
        {patient.isGlucometerTrack && (
          <Stat Icon={DropletIcon} value={glucoseValue} label={glucoseLabel} />
        )}
      </View>

      {(patient.isCaloriesExceeded || patient.isGlucoseOutOfRange) && (
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
    borderRadius: 32,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    gap: 12,
  },
  stat: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
