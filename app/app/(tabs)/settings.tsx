import DiagnosticsSection from "@/components/settings/DiagnosticsSection";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsItem from "@/components/settings/SettingsItem";
import AlertDialog from "@/components/ui/AlertDialog";
import SafeArea from "@/components/ui/SafeArea";
import Title from "@/components/ui/Title";
import { useAuthContext } from "@/context/AuthContext";
import { useSubscriptionContext } from "@/context/SubscriptionContext";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { Link, useRouter } from "expo-router";
import {
  LogOutIcon,
  PieChartIcon,
  UserXIcon,
  CrownIcon,
  CreditCardIcon,
  RefreshCwIcon,
} from "lucide-react-native";
import { Alert, ScrollView, StyleSheet } from "react-native";

export default function SettingsScreen() {
  const { signOut } = useAuthContext();
  const {
    isPro,
    isMonetizationEnabled,
    navigateToPaywall,
    manageSubscription,
    restorePurchases,
  } = useSubscriptionContext();
  const deleteUser = useMutation(api.users.deleteUser.default);
  const router = useRouter();

  const handleRestorePurchases = async () => {
    const customerInfo = await restorePurchases();
    if (customerInfo) {
      Alert.alert("Успех", "Покупки успешно восстановлены");
    } else {
      Alert.alert("Ошибка", "Не удалось восстановить покупки");
    }
  };

  const handleDeleteAccount = async () => {
    await deleteUser();
    await signOut();
    if (router.canDismiss()) router.dismissAll();
    router.replace("/auth");
  };

  const handleSignOut = async () => {
    await signOut();
    if (router.canDismiss()) router.dismissAll();
    router.replace("/auth");
  };

  return (
    <SafeArea edges={["top", "left", "right"]}>
      <Title style={styles.title}>Настройки</Title>
      <ScrollView
        contentContainerStyle={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <SettingsGroup>
          <Link href="/app/(settings)/adjustMacroTargets" asChild>
            <SettingsItem text="Настроить БЖУ" Icon={PieChartIcon} />
          </Link>
        </SettingsGroup>
        {isMonetizationEnabled && (
          <SettingsGroup>
            {!isPro && (
              <SettingsItem
                text="Стать Pro"
                Icon={CrownIcon}
                onPress={navigateToPaywall}
              />
            )}
            <SettingsItem
              text="Управление подпиской"
              Icon={CreditCardIcon}
              onPress={() => void manageSubscription()}
            />
            <SettingsItem
              text="Восстановить покупки"
              Icon={RefreshCwIcon}
              onPress={() => void handleRestorePurchases()}
            />
          </SettingsGroup>
        )}
        <SettingsGroup>
          <AlertDialog
            trigger={
              <SettingsItem
                destructive
                text="Удалить аккаунт"
                Icon={UserXIcon}
              />
            }
            destructive
            title="Удалить аккаунт"
            description="Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить."
            onConfirm={() => void handleDeleteAccount()}
          />
        </SettingsGroup>
        <SettingsGroup>
          <SettingsItem
            text="Выйти"
            Icon={LogOutIcon}
            onPress={() => void handleSignOut()}
          />
        </SettingsGroup>
        <DiagnosticsSection />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingBottom: 16,
  },
  scrollView: {
    flexGrow: 1,
    gap: 12,
    paddingBottom: 24,
  },
});
