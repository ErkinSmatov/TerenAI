import { Stack } from "expo-router";
import * as Sentry from "@sentry/react-native";
import RootLayoutProvider from "@/components/RootLayoutProvider";
import { useAuthContext } from "@/context/AuthContext";

function RootLayout() {
  return (
    <RootLayoutProvider>
      <RootNavigator />
    </RootLayoutProvider>
  );
}

// Sentry.wrap даёт хлебные крошки по касаниям и привязку событий к жизненному
// циклу приложения.
export default Sentry.wrap(RootLayout);

function RootNavigator() {
  const { isAuthenticated } = useAuthContext();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="app" />
      </Stack.Protected>

      <Stack.Screen name="onboarding" />

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="auth" />
      </Stack.Protected>
    </Stack>
  );
}
