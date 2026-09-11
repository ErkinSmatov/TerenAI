import DiagnosticsSection from "@/components/settings/DiagnosticsSection";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsItem from "@/components/settings/SettingsItem";
import AlertDialog from "@/components/ui/AlertDialog";
import SafeArea from "@/components/ui/SafeArea";
import Title from "@/components/ui/Title";
import { Toast } from "@/components/ui/Toast";
import { useAuthContext } from "@/context/AuthContext";
import { useSubscriptionContext } from "@/context/SubscriptionContext";
import { api } from "@/convex/_generated/api";
import buildMonthlyReportHtml from "@/lib/reports/buildMonthlyReportHtml";
import tryCatch from "@/lib/utils/tryCatch";
import { useConvex, useMutation } from "convex/react";
import { Link, useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  LogOutIcon,
  PieChartIcon,
  UserXIcon,
  CrownIcon,
  CreditCardIcon,
  RefreshCwIcon,
  HeartPulseIcon,
  UsersIcon,
  FileDownIcon,
  ScaleIcon,
  BellIcon,
  TrophyIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet } from "react-native";

const exportReportErrorText =
  "Не удалось собрать отчёт. Попробуйте ещё раз";

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
  const convex = useConvex();
  const router = useRouter();
  const [isExportingReport, setIsExportingReport] = useState(false);

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

  const handleExportReport = async () => {
    if (isExportingReport) return;
    setIsExportingReport(true);

    const { data: report, error: reportError } = await tryCatch(
      convex.query(api.reports.getMonthlyReport.default, {
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      })
    );

    if (reportError) {
      Toast.show({ text: exportReportErrorText, variant: "error" });
      setIsExportingReport(false);
      return;
    }

    const html = buildMonthlyReportHtml(report);
    const { data: file, error: printError } = await tryCatch(
      Print.printToFileAsync({ html, base64: false })
    );

    if (printError) {
      Toast.show({ text: exportReportErrorText, variant: "error" });
      setIsExportingReport(false);
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    }

    setIsExportingReport(false);
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
          <Link href="/app/(settings)/weeklyWeighIn" asChild>
            <SettingsItem text="Обновить вес" Icon={ScaleIcon} />
          </Link>
          {Platform.OS === "ios" && (
            <Link href="/app/(settings)/health" asChild>
              <SettingsItem text="Здоровье" Icon={HeartPulseIcon} />
            </Link>
          )}
          <Link href="/app/(settings)/observerCode" asChild>
            <SettingsItem text="Доступ наблюдателя" Icon={UsersIcon} />
          </Link>
          <Link href="/app/(settings)/notificationSettings" asChild>
            <SettingsItem text="Уведомления" Icon={BellIcon} />
          </Link>
          <Link href="/app/(settings)/badges" asChild>
            <SettingsItem text="Достижения" Icon={TrophyIcon} />
          </Link>
          <SettingsItem
            text="Экспорт анализа"
            Icon={FileDownIcon}
            onPress={() => void handleExportReport()}
            isLast
          />
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
