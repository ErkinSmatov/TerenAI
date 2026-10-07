import { Share, View } from "react-native";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { RefreshCwIcon, SendIcon } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import Text from "../ui/Text";
import Button from "../ui/Button";
import AlertDialog from "../ui/AlertDialog";
import WithSkeleton from "../ui/WithSkeleton";
import { Toast } from "../ui/Toast";
import getColor from "@/lib/ui/getColor";
import getNutrientGlow from "@/lib/ui/getNutrientGlow";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { useThemeContext } from "@/context/ThemeContext";
import {
  CARD_BACKGROUND_DARK,
  CARD_GLOW,
  TILE_BACKGROUND_DARK,
} from "./observerCardTheme";

const CONNECT_ERROR = "Не удалось подключиться. Попробуйте ещё раз.";

export default function ShareCodeCard() {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  const generateCode = useMutation(api.observers.generateCode.default);
  const regenerateCode = useMutation(api.observers.regenerateCode.default);

  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    generateCode()
      .then(setCode)
      .catch(() => {
        Toast.show({ text: CONNECT_ERROR, variant: "error" });
      });
  }, [generateCode]);

  const handleRegenerate = async () => {
    try {
      const newCode = await regenerateCode();
      setCode(newCode);
    } catch {
      Toast.show({ text: CONNECT_ERROR, variant: "error" });
    }
  };

  const handleShare = () => {
    if (!code) return;
    void Share.share({ message: `Мой код в TerenAI: ${code}` });
  };

  const iconColor = getColor("foreground", undefined, theme);

  return (
    <View
      style={[
        styles.card,
        getNutrientGlow(theme, CARD_GLOW.dark, CARD_GLOW.light),
      ]}
    >
      <View style={styles.texts}>
        <Text size="16" weight="600">
          Поделитесь кодом
        </Text>
        <Text size="12" color={getColor("mutedForeground", undefined, theme)}>
          Код постоянный — по нему наблюдатель видит ваши данные за сегодня.
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.codeContainer}>
          <WithSkeleton loading={code === null} skeletonStyle={styles.skeleton}>
            <Text
              size="28"
              weight="600"
              family="outfit"
              style={styles.code}
              numberOfLines={1}
            >
              {code ?? ""}
            </Text>
          </WithSkeleton>
        </View>
        <AlertDialog
          trigger={
            <Button
              variant="base"
              size="base"
              style={styles.iconButton}
              accessibilityLabel="Обновить код"
            >
              <RefreshCwIcon size={20} color={iconColor} />
            </Button>
          }
          destructive={false}
          title="Обновить код доступа"
          description="Прежний код перестанет работать. Уже подключённые наблюдатели доступ не потеряют."
          onConfirm={() => void handleRegenerate()}
        />
        <Button
          variant="base"
          size="base"
          style={styles.iconButton}
          accessibilityLabel="Отправить код"
          onPress={handleShare}
        >
          <SendIcon size={20} color={iconColor} />
        </Button>
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeName) =>
  ({
    card: {
      borderRadius: 32,
      padding: 20,
      gap: 16,
      backgroundColor:
        theme === "dark"
          ? CARD_BACKGROUND_DARK
          : getColor("base", undefined, theme),
    },
    texts: {
      gap: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    codeContainer: {
      flex: 1,
    },
    skeleton: {
      height: 36,
      width: "60%",
      borderRadius: 12,
    },
    code: {
      letterSpacing: 6,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        theme === "dark"
          ? TILE_BACKGROUND_DARK
          : getColor("muted", undefined, theme),
    },
  }) as const;
