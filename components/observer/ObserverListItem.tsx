import { StyleSheet, View } from "react-native";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Trash2Icon, UserIcon } from "lucide-react-native";
import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";
import AlertDialog from "@/components/ui/AlertDialog";
import getColor from "@/lib/ui/getColor";

type Props = {
  displayName: string;
  linkedAt: number;
  onRevoke: () => void;
  isLast?: boolean;
};

export default function ObserverListItem({
  displayName,
  linkedAt,
  onRevoke,
  isLast,
}: Props) {
  return (
    <View style={[styles.container, !isLast && { borderBottomWidth: 1 }]}>
      <View style={styles.rowIcon}>
        <UserIcon size={16} color={getColor("mutedForeground")} />
      </View>
      <View style={styles.textContainer}>
        <Text size="16" weight="400">
          {displayName}
        </Text>
        <Text size="12" color={getColor("mutedForeground")}>
          {`Подключён ${format(linkedAt, "d MMMM", { locale: ru })}`}
        </Text>
      </View>
      <AlertDialog
        trigger={
          <Button
            variant="base"
            size="base"
            style={styles.revokeButton}
            accessibilityLabel="Отозвать доступ"
          >
            <Trash2Icon size={18} color={getColor("destructive")} />
          </Button>
        }
        destructive
        title="Отозвать доступ"
        description="Наблюдатель больше не будет видеть ваши данные. Чтобы вернуть доступ, поделитесь кодом снова."
        onConfirm={onRevoke}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    borderColor: getColor("muted"),
  },
  rowIcon: {
    height: 32,
    width: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: getColor("muted"),
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  revokeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
