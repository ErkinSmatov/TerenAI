// Локальное состояние синхронизации здоровья (MMKV)
import { storage } from "@/lib/storage/mmkv";

// По userId: смена аккаунта на устройстве не пропускает показания нового пользователя
export function healthGlucoseLastSyncKey(userId: string): string {
  return `health_glucose_last_sync_${userId}`;
}

export function getLastGlucoseSync(userId: string): number | null {
  const value = storage.getNumber(healthGlucoseLastSyncKey(userId));
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function setLastGlucoseSync(userId: string, ms: number): void {
  storage.set(healthGlucoseLastSyncKey(userId), ms);
}

export const HEALTH_PROMPT_SEEN_KEY = "health_prompt_seen_v1";

export function hasSeenHealthPrompt(): boolean {
  return storage.getBoolean(HEALTH_PROMPT_SEEN_KEY) === true;
}

export function markHealthPromptSeen(): void {
  storage.set(HEALTH_PROMPT_SEEN_KEY, true);
}
