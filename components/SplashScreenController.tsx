import { useAuthContext } from "@/context/AuthContext";
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { SplashScreen } from "expo-router";
import { useEffect } from "react";

type Props = {
  children: React.ReactNode;
};

export function SplashScreenController({ children }: Props) {
  const { isLoading: isAuthLoading } = useAuthContext();

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Outfit_400Regular,
    Outfit_600SemiBold,
  });

  const isReady = !isAuthLoading && fontsLoaded;

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
