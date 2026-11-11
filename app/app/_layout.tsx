import { useAuthContext } from "@/context/AuthContext";
import useProfileStatus from "@/lib/hooks/useProfileStatus";
import { Redirect, Stack } from "expo-router";
import MealCompletionWatcher from "@/components/meal/MealCompletionWatcher";
import HealthAccessPrompt from "@/components/health/HealthAccessPrompt";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const { isProfileLoading, hasCompletedOnboarding } = useProfileStatus();

  if (isLoading || isProfileLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <>
      <MealCompletionWatcher />
      <HealthAccessPrompt />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
