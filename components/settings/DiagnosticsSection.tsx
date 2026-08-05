import { useState } from "react";
import { Alert } from "react-native";
import * as Application from "expo-application";
import * as Sentry from "@sentry/react-native";
import {
  InfoIcon,
  MessageSquareIcon,
  BugIcon,
  FileWarningIcon,
  SkullIcon,
} from "lucide-react-native";
import SettingsGroup from "./SettingsGroup";
import SettingsItem from "./SettingsItem";
import AlertDialog from "../ui/AlertDialog";
import logError from "@/lib/utils/logError";

// Раздел диагностики скрыт за семью нажатиями по строке с версией, чтобы
// обычный тестер не открыл его случайно. Это не секрет: при распаковке IPA
// он виден, и это приемлемо — действия только отправляют синтетические
// события и не читают пользовательские данные.
//
// Раздел остаётся в приложении постоянно. Удалить его после проверки стоило
// бы ещё одного цикла сборки и заливки в 30-45 минут, поскольку OTA-обновлений
// в проекте нет (expo-updates не установлен, см. Phase 5 роадмапа).

const UNLOCK_TAPS = 7;
const TAP_RESET_MS = 3000;

export default function DiagnosticsSection() {
  const [tapCount, setTapCount] = useState(0);
  const [lastTapAt, setLastTapAt] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const version = Application.nativeApplicationVersion ?? "?";
  const build = Application.nativeBuildVersion ?? "?";

  const handleVersionPress = () => {
    if (isUnlocked) return;

    const now = Date.now();
    const next = now - lastTapAt > TAP_RESET_MS ? 1 : tapCount + 1;

    setLastTapAt(now);
    setTapCount(next);

    if (next >= UNLOCK_TAPS) setIsUnlocked(true);
  };

  const handleTestMessage = () => {
    const eventId = Sentry.captureMessage(
      "TerenAI diagnostics: test message",
      "info"
    );
    Alert.alert("Отправлено", `Тестовое сообщение\nEvent ID: ${eventId}`);
  };

  const handleTestError = () => {
    const eventId = Sentry.captureException(
      new Error("TerenAI diagnostics: test error")
    );
    Alert.alert("Отправлено", `Тестовая ошибка\nEvent ID: ${eventId}`);
  };

  // Отдельное действие от предыдущего намеренно: оно проверяет именно цепочку
  // logError → реестр репортеров → Sentry (OBS-02), а не прямой вызов SDK.
  const handleTestLogError = () => {
    logError(
      "TerenAI diagnostics: logError path",
      new Error("TerenAI diagnostics: logError test error")
    );
    Alert.alert(
      "Отправлено",
      "Вызван logError. Событие должно появиться в Sentry с тегом source=logError."
    );
  };

  return (
    <>
      <SettingsGroup>
        <SettingsItem
          text={`TerenAI ${version} (${build})`}
          Icon={InfoIcon}
          onPress={handleVersionPress}
        />
      </SettingsGroup>

      {isUnlocked && (
        <SettingsGroup>
          <SettingsItem
            text="Отправить тестовое сообщение"
            Icon={MessageSquareIcon}
            onPress={handleTestMessage}
          />
          <SettingsItem
            text="Отправить тестовую ошибку"
            Icon={BugIcon}
            onPress={handleTestError}
          />
          <SettingsItem
            text="Проверить logError"
            Icon={FileWarningIcon}
            onPress={handleTestLogError}
          />
          <AlertDialog
            trigger={
              <SettingsItem
                destructive
                text="Нативный краш (приложение закроется)"
                Icon={SkullIcon}
              />
            }
            destructive
            title="Вызвать нативный краш"
            description="Приложение немедленно закроется. Событие отправится в Sentry при следующем запуске."
            onConfirm={() => {
              Sentry.nativeCrash();
            }}
          />
        </SettingsGroup>
      )}
    </>
  );
}
