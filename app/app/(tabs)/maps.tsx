import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { UserIcon, UsersIcon } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import ObservedPatientCard from "@/components/observer/ObservedPatientCard";
import ObserverCard from "@/components/observer/ObserverCard";
import ShareCodeCard from "@/components/observer/ShareCodeCard";
import OTPInput, { OTPInputHandle } from "@/components/ui/OTPInput";
import SafeArea from "@/components/ui/SafeArea";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Text from "@/components/ui/Text";
import Title from "@/components/ui/Title";
import { Toast } from "@/components/ui/Toast";
import { useThemeContext } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

const TAB_OBSERVED = "Наблюдаемые";
const TAB_OBSERVERS = "Наблюдатели";

function MapsEmptyState({
  Icon,
  title,
  hint,
}: {
  Icon: LucideIcon;
  title: string;
  hint: string;
}) {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.emptyState}>
      <Icon size={28} color={getColor("mutedForeground", undefined, theme)} />
      <Text size="16" weight="600" style={styles.emptyText}>
        {title}
      </Text>
      <Text
        size="14"
        color={getColor("mutedForeground", 0.8, theme)}
        style={styles.emptyText}
      >
        {hint}
      </Text>
    </View>
  );
}

export default function MapsScreen() {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  const patients = useQuery(api.observers.getObservedPatients.default, {
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
  });
  const observers = useQuery(api.observers.getMyObservers.default);
  const redeemCode = useMutation(api.observers.redeemCode.default);
  const revokeLink = useMutation(api.observers.revokeLink.default);

  const inputRef = useRef<OTPInputHandle>(null);
  const [activeTab, setActiveTab] = useState<string>(TAB_OBSERVED);

  const handleFilled = async (code: string) => {
    try {
      await redeemCode({ code });
      inputRef.current?.clear();
      setActiveTab(TAB_OBSERVED);
    } catch (error) {
      inputRef.current?.flashError();
      inputRef.current?.clear();
      const message = error instanceof Error ? error.message : "";

      if (message.includes("Code not found")) {
        Toast.show({
          text: "Код не найден. Проверьте и попробуйте снова.",
          variant: "error",
        });
      } else if (message.includes("Cannot observe yourself")) {
        Toast.show({
          text: "Это ваш код — наблюдать за собой нельзя.",
          variant: "error",
        });
      } else {
        Toast.show({
          text: "Не удалось подключиться. Попробуйте ещё раз.",
          variant: "error",
        });
      }
    }
  };

  const handleRevoke = async (linkId: Id<"observerLinks">) => {
    try {
      await revokeLink({ linkId });
    } catch {
      Toast.show({
        text: "Не удалось подключиться. Попробуйте ещё раз.",
        variant: "error",
      });
    }
  };

  return (
    <SafeArea edges={["top", "left", "right"]}>
      <Title style={styles.title}>Карты</Title>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <ShareCodeCard />
        <View style={styles.codeEntry}>
          <Text size="14" color={getColor("mutedForeground", undefined, theme)}>
            Введите код, чтобы наблюдать
          </Text>
          <OTPInput
            ref={inputRef}
            length={5}
            onFilled={(code) => void handleFilled(code)}
          />
        </View>
        <View style={styles.tabs}>
          <SegmentedControl
            options={[TAB_OBSERVED, TAB_OBSERVERS]}
            selectedOption={activeTab}
            onChange={setActiveTab}
          />
        </View>
        {activeTab === TAB_OBSERVED ? (
          patients === undefined ? null : patients.length === 0 ? (
            <MapsEmptyState
              Icon={UsersIcon}
              title="Вы пока никого не наблюдаете"
              hint="Введите код выше, чтобы увидеть данные человека за сегодня."
            />
          ) : (
            <View style={styles.observedList}>
              {patients.map((item) => (
                <ObservedPatientCard
                  key={item.linkId}
                  patient={item}
                  onRemove={() => void handleRevoke(item.linkId)}
                />
              ))}
            </View>
          )
        ) : observers === undefined ? null : observers.length === 0 ? (
          <MapsEmptyState
            Icon={UserIcon}
            title="Пока никто не наблюдает за вами"
            hint="Поделитесь кодом, чтобы дать доступ к своим данным."
          />
        ) : (
          <View style={styles.observersList}>
            {observers.map((o) => (
              <ObserverCard
                key={o.linkId}
                displayName={o.displayName}
                linkedAt={o.linkedAt}
                onRevoke={() => void handleRevoke(o.linkId)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeArea>
  );
}

const createStyles = (_theme: ThemeName) =>
  ({
    title: {
      paddingBottom: 16,
    },
    content: {
      flexGrow: 1,
      gap: 16,
      paddingBottom: 24,
    },
    codeEntry: {
      gap: 8,
    },
    tabs: {
      alignSelf: "stretch",
      alignItems: "center",
    },
    observedList: {
      gap: 16,
    },
    observersList: {
      gap: 12,
    },
    emptyState: {
      alignItems: "center",
      gap: 8,
      paddingVertical: 32,
    },
    emptyText: {
      textAlign: "center",
    },
  }) as const;
