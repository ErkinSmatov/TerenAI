import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
  ScreenMainTitle,
} from "@/components/ui/screen/ScreenMain";
import Text from "@/components/ui/Text";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AlertDialog from "@/components/ui/AlertDialog";
import WithSkeleton from "@/components/ui/WithSkeleton";
import { Toast } from "@/components/ui/Toast";
import SettingsGroup from "@/components/settings/SettingsGroup";
import ObserverListItem from "@/components/observer/ObserverListItem";
import { StyleSheet, View, Share } from "react-native";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import getColor from "@/lib/ui/getColor";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";

const CODE_LENGTH = 5;

export default function ObserverCodeScreen() {
  const { scrollY, onScroll } = useScrollY();

  const generateCode = useMutation(api.observers.generateCode.default);
  const regenerateCode = useMutation(api.observers.regenerateCode.default);
  const revokeLink = useMutation(api.observers.revokeLink.default);
  const observers = useQuery(api.observers.getMyObservers.default);

  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    void generateCode().then(setCode);
  }, [generateCode]);

  const handleShare = () => {
    if (!code) return;
    void Share.share({ message: `Мой код в TerenAI: ${code}` });
  };

  const handleRegenerate = async () => {
    try {
      const newCode = await regenerateCode();
      setCode(newCode);
    } catch {
      Toast.show({
        text: "Не удалось подключиться. Попробуйте ещё раз.",
        variant: "error",
      });
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
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Доступ наблюдателя" />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <ScreenMainTitle
          title="Поделитесь кодом"
          description="Код постоянный — по нему наблюдатель видит ваши данные за сегодня. Поделиться можно с несколькими людьми."
        />

        <WithSkeleton loading={code === null} skeletonStyle={styles.codeSkeleton}>
          <View style={styles.codeRow}>
            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
              <Card key={`code-digit-${index}`} style={styles.codeBox}>
                <Text size="28" weight="600" style={styles.codeDigit}>
                  {code?.at(index) ?? ""}
                </Text>
              </Card>
            ))}
          </View>
        </WithSkeleton>

        <View style={styles.actionsRow}>
          <Button
            variant="primary"
            size="base"
            style={styles.actionButton}
            onPress={handleShare}
          >
            Поделиться кодом
          </Button>
          <AlertDialog
            trigger={
              <Button
                variant="secondary"
                size="base"
                style={styles.actionButton}
              >
                Обновить код
              </Button>
            }
            destructive={false}
            title="Обновить код доступа"
            description="Прежний код перестанет работать. Уже подключённые наблюдатели доступ не потеряют."
            onConfirm={() => void handleRegenerate()}
          />
        </View>

        <View style={styles.observersSection}>
          <Text size="20" weight="600" style={styles.sectionTitle}>
            Мои наблюдатели
          </Text>
          {observers === undefined ? null : observers.length === 0 ? (
            <Text
              size="14"
              color={getColor("mutedForeground", 0.5)}
              style={styles.emptyText}
            >
              Пока никто не подключился по вашему коду. Поделитесь кодом,
              чтобы дать доступ.
            </Text>
          ) : (
            <SettingsGroup>
              {observers.map((observer) => (
                <ObserverListItem
                  key={observer.linkId}
                  displayName={observer.displayName}
                  linkedAt={observer.linkedAt}
                  onRevoke={() => void handleRevoke(observer.linkId)}
                />
              ))}
            </SettingsGroup>
          )}
        </View>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  codeRow: {
    flexDirection: "row",
    gap: 16,
  },
  codeSkeleton: {
    height: 100,
    width: "100%",
    borderRadius: 16,
  },
  codeBox: {
    flex: 1,
    height: 100,
    padding: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  codeDigit: {
    letterSpacing: 1,
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    height: 48,
  },
  observersSection: {
    marginTop: 24,
    gap: 12,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  emptyText: {
    paddingVertical: 8,
  },
});
