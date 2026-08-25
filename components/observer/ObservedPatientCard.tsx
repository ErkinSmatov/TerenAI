import { StyleSheet, View } from "react-native";
import { format } from "date-fns";
import {
  DropletIcon,
  FlameIcon,
  FootprintsIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react-native";
import { Link } from "expo-router";
import Text from "../ui/Text";
import Card from "../ui/Card";
import Button from "../ui/Button";
import AlertDialog from "../ui/AlertDialog";
import WarningBadge from "../ui/WarningBadge";
import { Id } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import { glucoseContextLabels, GlucoseContext, GlucoseUnit } from "@/config/glucoseConfig";

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
  Icon: typeof FootprintsIcon;
  value: string;
  label: string;
};

function Stat({ Icon, value, label }: StatProps) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <Icon size={16} color={getColor("mutedForeground")} />
      </View>
      <View>
        <Text size="16" weight="600">
          {value}
        </Text>
        <Text size="12" color={getColor("mutedForeground")}>
          {label}
        </Text>
      </View>
    </View>
  );
}

type Props = {
  patient: ObservedPatient;
  onRemove: () => void;
};

export default function ObservedPatientCard({ patient, onRemove }: Props) {
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

  const cardContent = (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text size="20" weight="600">
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
              <XIcon size={18} color={getColor("mutedForeground")} />
            </Button>
          }
          destructive
          title="Убрать из списка наблюдаемых"
          description="Вы перестанете видеть данные этого пациента. Чтобы возобновить доступ, потребуется новый код."
          onConfirm={onRemove}
        />
      </View>

      <View style={styles.metricsRow}>
        <Stat
          Icon={FlameIcon}
          value={String(patient.caloriesTotal)}
          label={caloriesLabel}
        />
        <Stat
          Icon={UtensilsIcon}
          value={String(patient.mealsCount)}
          label="приёмов пищи"
        />
        {patient.isGlucometerTrack && (
          <Stat Icon={DropletIcon} value={glucoseValue} label={glucoseLabel} />
        )}
        {patient.steps !== null && (
          <Stat
            Icon={FootprintsIcon}
            value={patient.steps.toLocaleString("ru-RU")}
            label="шаги"
          />
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
    </Card>
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
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    rowGap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: "40%",
  },
  statIcon: {
    height: 32,
    width: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: getColor("muted"),
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
