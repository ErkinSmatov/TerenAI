import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useRateLimit } from "@convex-dev/rate-limiter/react";
import { api } from "@/convex/_generated/api";
import { Toast } from "../ui/Toast";
import { useSubscriptionContext } from "@/context/SubscriptionContext";
import type { AddOption } from "./addMealOptions";

type PressOptions = {
  date?: string;
  beforeNavigate?: () => void;
};

// Общая логика выбора способа добавления: меню «+» и лист на экране дня.
export function useAddOptionPress() {
  const router = useRouter();
  const { hasProAccess, navigateToPaywall } = useSubscriptionContext();
  const { status } = useRateLimit(api.rateLimit.getAiFeaturesRateLimit, {
    getServerTimeMutation: api.rateLimit.getServerTime,
  });

  return (option: AddOption, opts?: PressOptions) => {
    opts?.beforeNavigate?.();

    if (!hasProAccess && option.isPro) {
      if (Platform.OS === "android") {
        setTimeout(() => {
          navigateToPaywall();
        }, 200);
      } else {
        navigateToPaywall();
      }
      return;
    }

    if (option.isAiFeature && status && !status.ok) {
      Toast.show({
        text: "Вы достигли дневного лимита функций ИИ.",
        variant: "error",
      });
      return;
    }

    const params: Record<string, string> =
      option.supportsDate && opts?.date ? { date: opts.date } : {};

    if (Platform.OS === "android") {
      setTimeout(() => {
        router.push({ pathname: option.pathname, params });
      }, 200);
    } else {
      router.push({ pathname: option.pathname, params });
    }
  };
}
