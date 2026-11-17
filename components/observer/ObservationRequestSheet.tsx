import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import BottomSheet from "../ui/BottomSheet";
import Text from "../ui/Text";
import { Toast } from "../ui/Toast";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { useThemeContext } from "@/context/ThemeContext";
import IncomingRequestCard from "./IncomingRequestCard";

export default function ObservationRequestSheet() {
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const requests = useQuery(api.observers.getIncomingRequests.default);
  const respond = useMutation(api.observers.respondToRequest.default);
  const sheetRef = useRef<BottomSheetModal>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!requests) return;
    if (requests.length === 0) {
      sheetRef.current?.dismiss();
      return;
    }
    const hasNew = requests.some((r) => !seenRef.current.has(r.linkId));
    if (hasNew) {
      for (const r of requests) seenRef.current.add(r.linkId);
      sheetRef.current?.present();
    }
  }, [requests]);

  const handleRespond = async (
    linkId: Id<"observerLinks">,
    decision: "accept" | "decline"
  ) => {
    setBusyId(linkId);
    try {
      await respond({ linkId, decision });
      Toast.show({
        text: decision === "accept" ? "Доступ разрешён" : "Запрос отклонён",
        variant: "success",
      });
    } catch {
      Toast.show({
        text: "Не удалось ответить. Попробуйте ещё раз.",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.content}>
        <Text size="20" weight="600">
          Запросы на наблюдение
        </Text>
        <Text size="14" color={getColor("mutedForeground", undefined, theme)}>
          Наблюдатель увидит ваши данные о питании, глюкозе и активности после
          подтверждения.
        </Text>
        {(requests ?? []).map((item) => (
          <IncomingRequestCard
            key={item.linkId}
            displayName={item.displayName}
            requestedAt={item.requestedAt}
            doctorClinic={item.doctor?.clinic ?? null}
            busy={busyId === item.linkId}
            onAccept={() => void handleRespond(item.linkId, "accept")}
            onDecline={() => void handleRespond(item.linkId, "decline")}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

const createStyles = (_theme: ThemeName) =>
  ({
    content: {
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
  }) as const;
