import { Platform, View } from "react-native";
import Button from "@/components/ui/Button";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { makeRedirectUri } from "expo-auth-session";
import { openAuthSessionAsync } from "expo-web-browser";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Phone as PhoneIcon } from "lucide-react-native";
import Text from "@/components/ui/Text";
import GoogleLogo from "@/assets/svg/google-logo.svg";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { useState } from "react";
import logError from "@/lib/utils/logError";
import { Toast } from "@/components/ui/Toast";

const signInErrorText = "Не удалось войти. Попробуйте ещё раз";

type Props = {
  onPhoneLogin?: () => void;
  onSuccess?: () => Promise<void>;
  disabled?: boolean;
  shouldRedirect?: boolean;
};

const redirectTo = makeRedirectUri();

export default function SignInButtons({
  onPhoneLogin,
  onSuccess,
  disabled = false,
  shouldRedirect = true,
}: Props) {
  const { signIn } = useAuthContext();
  const { theme } = useThemeContext();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogin = async (provider: "google" | "apple") => {
    if (disabled || isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const { redirect } = await signIn(provider, { redirectTo });
      if (Platform.OS === "web") {
        return;
      }
      if (!redirect) {
        logError("Missing redirect URL from signIn response", provider);
        Toast.show({ text: signInErrorText, variant: "error" });
        return;
      }
      const result = await openAuthSessionAsync(
        redirect.toString(),
        redirectTo
      );
      if (result.type === "success") {
        const { url } = result;
        const code = new URL(url).searchParams.get("code");
        if (!code) {
          logError("Authorization code not found in redirect callback", url);
          Toast.show({ text: signInErrorText, variant: "error" });
          return;
        }
        await signIn(provider, { code });
        await onSuccess?.();
        if (shouldRedirect) {
          if (router.canDismiss()) router.dismissAll();
          router.replace("/app");
        }
      }
    } catch (error) {
      logError("Authentication error", error);
      Toast.show({ text: signInErrorText, variant: "error" });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePhoneLogin = () => {
    onPhoneLogin?.();
    router.navigate("/auth/phone-sign-in");
  };

  return (
    <View style={styles.container}>
      {Platform.OS === "ios" && (
        <Button
          size="lg"
          variant="primary"
          style={styles.button}
          onPress={() => void handleLogin("apple")}
          disabled={disabled || isAuthenticating}
        >
          <FontAwesome5 name="apple" size={28} color={getColor("background", undefined, theme)} />
          <Text
            size="16"
            weight="500"
            color={getColor("background", undefined, theme)}
            style={styles.buttonPrimaryText}
          >
            Продолжить с Apple
          </Text>
        </Button>
      )}
      <Button
        size="lg"
        variant={Platform.OS === "android" ? "primary" : "outline"}
        style={styles.button}
        onPress={() => void handleLogin("google")}
        disabled={disabled || isAuthenticating}
      >
        <GoogleLogo height={24} width={24} />
        <Text
          size="16"
          weight={Platform.OS === "android" ? undefined : "500"}
          color={Platform.OS === "android" ? getColor("background", undefined, theme) : undefined}
        >
          Продолжить с Google
        </Text>
      </Button>
      <Button
        size="lg"
        variant="outline"
        style={styles.button}
        onPress={handlePhoneLogin}
        disabled={disabled || isAuthenticating}
      >
        <PhoneIcon size={24} color={getColor("foreground", undefined, theme)} />
        <Text size="16" weight="500">
          Войти по номеру телефона
        </Text>
      </Button>
    </View>
  );
}

const createStyles = (theme: ThemeName) => ({
  container: {
    gap: 20,
  },
  button: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 12,
    flexDirection: "row" as const,
  },
  buttonPrimaryText: {
    color: getColor("background", undefined, theme),
  },
  buttonOutlineText: {
    color: getColor("foreground", undefined, theme),
    fontWeight: 500 as const,
  },
});
