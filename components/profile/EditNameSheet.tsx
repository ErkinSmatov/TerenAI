import { useRef, useState } from "react";
import { View } from "react-native";
import { useMutation } from "convex/react";
import { PencilIcon } from "lucide-react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";
import TextInput from "../ui/TextInput";
import Text from "../ui/Text";
import { Toast } from "../ui/Toast";
import { api } from "@/convex/_generated/api";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";

type Props = {
  currentName: string | null;
};

// Пользователи, вошедшие по телефону (WhatsApp/Telegram OTP), не получают
// имя ни от одного провайдера — показывают голый номер/"Гость" в шапке и
// профиле. Карандаш у имени даёт возможность задать/поменять ФИО вручную.
export default function EditNameSheet({ currentName }: Props) {
  const { theme } = useThemeContext();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [value, setValue] = useState(currentName ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const updateUserName = useMutation(api.users.updateUserName.default);

  const isValid = value.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || isSaving) return;
    setIsSaving(true);
    try {
      await updateUserName({ name: value.trim() });
      sheetRef.current?.dismiss();
    } catch {
      Toast.show({ text: "Не удалось сохранить имя", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      Trigger={
        <Button variant="base" size="base" hitSlop={12}>
          <PencilIcon size={16} color={getColor("mutedForeground", undefined, theme)} />
        </Button>
      }
    >
      <View style={{ gap: 20 }}>
        <Text size="16" weight="600">
          Как вас зовут?
        </Text>
        <TextInput
          placeholder="Имя Фамилия"
          value={value}
          onChangeText={setValue}
          autoFocus
          autoCapitalize="words"
        />
        <Button
          onPress={() => void handleSave()}
          disabled={!isValid || isSaving}
        >
          {isSaving ? "Сохраняем…" : "Сохранить"}
        </Button>
      </View>
    </BottomSheet>
  );
}
