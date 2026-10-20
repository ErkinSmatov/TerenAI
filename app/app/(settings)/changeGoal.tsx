import { OnboardingSectionType } from "@/components/onboarding/Onboarding";
import OnboardingSectionLayout from "@/components/onboarding/OnboardingSectionLayout";
import OnboardingStep from "@/components/onboarding/OnboardingStep";
import OnboardingStepLayout from "@/components/onboarding/OnboardingStepLayout";
import OnboardingGoal from "@/components/onboarding/steps/goal/OnboardingGoal";
import OnboardingTargetWeight from "@/components/onboarding/steps/goal/OnboardingTargetWeight";
import OnboardingWeightChangeRate from "@/components/onboarding/steps/goal/OnboardingWeightChangeRate";
import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";
import { Toast } from "@/components/ui/Toast";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { needsGoalDetails, normalizeGoalDetails } from "@/lib/goal/goalDetails";
import getColor from "@/lib/ui/getColor";
import tryCatch from "@/lib/utils/tryCatch";
import { usePreventRemove } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  EntryAnimationsValues,
  ExitAnimationsValues,
  LayoutAnimation,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Targets = Doc<"profiles">["targets"];

type PreviewProps = {
  before: Targets | undefined;
  after: Targets | undefined;
  goalDetailsMissing: boolean;
  onFillDetails: () => void;
};

function GoalChangePreview({
  before,
  after,
  goalDetailsMissing,
  onFillDetails,
}: PreviewProps) {
  const rows: { label: string; key: keyof Targets; unit: string }[] = [
    { label: "Калории", key: "calories", unit: "ккал" },
    { label: "Белки", key: "protein", unit: "г" },
    { label: "Жиры", key: "fat", unit: "г" },
    { label: "Углеводы", key: "carbs", unit: "г" },
  ];

  return (
    <OnboardingStep title="Новые нормы">
      <View style={styles.rows}>
        {rows.map((row) => (
          <Text key={row.key} size="18">
            {row.label}: {before ? Math.round(before[row.key]) : "—"} →{" "}
            {after ? Math.round(after[row.key]) : "…"} {row.unit}
          </Text>
        ))}
        <Text size="16" color={getColor("mutedForeground")}>
          Нормы БЖУ, настроенные вручную, будут заменены
        </Text>
        {goalDetailsMissing && (
          <View style={styles.missing}>
            <Text size="16" color={getColor("destructive")}>
              Укажите целевой вес и темп
            </Text>
            <Button variant="secondary" size="md" onPress={onFillDetails}>
              Указать
            </Button>
          </View>
        )}
      </View>
    </OnboardingStep>
  );
}

export default function GoalChangeScreen() {
  const profile = useQuery(api.profiles.getProfile.default);
  const updateProfile = useMutation(api.profiles.updateProfile.default);
  const context = useOnboardingContext();
  const { data, setData } = context;
  const router = useRouter();
  const transitionDirection = useSharedValue<-1 | 0 | 1>(0);

  const [step, setStep] = useState(0);
  const [askDetails, setAskDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasHydratedRef = useRef(false);
  const latestProfileDataRef = useRef(profile?.data);

  useEffect(() => {
    latestProfileDataRef.current = profile?.data;
    if (profile?.data && !hasHydratedRef.current) {
      hasHydratedRef.current = true;
      const profileData = profile.data;
      setData((prev) => ({ ...prev, ...profileData }));
    }
  }, [profile, setData]);

  // Незавершённый выбор не должен остаться в глобальном контексте.
  useEffect(() => {
    return () => {
      const saved = latestProfileDataRef.current;
      if (saved) {
        setData((prev) => ({ ...prev, ...saved }));
      }
    };
  }, [setData]);

  const computedTargets = useQuery(
    api.nutrition.computeNutritionTargets.default,
    profile?.data && data.goal
      ? {
          sex: profile.data.sex,
          birthDate: profile.data.birthDate,
          height: profile.data.height,
          weight: profile.data.weight,
          activityLevel: profile.data.activityLevel,
          weeklyWorkouts: profile.data.weeklyWorkouts,
          training: profile.data.training,
          liftingExperience: profile.data.liftingExperience,
          cardioExperience: profile.data.cardioExperience,
          goal: data.goal,
          weightChangeRate: data.weightChangeRate,
        }
      : "skip",
  );

  const goalDetailsMissing = needsGoalDetails(data);

  const handleFillDetails = () => {
    transitionDirection.value = -1;
    setAskDetails(true);
    setData((prev) => ({ ...prev, ...normalizeGoalDetails(prev) }));
    setStep(1);
  };

  const steps: OnboardingSectionType["steps"] = [
    {
      screen: <OnboardingGoal key="goal" />,
      completed: ({ data: d }) => d.goal !== undefined,
      skip: () => false,
      showHeader: true,
      scrollView: true,
    },
    {
      screen: <OnboardingTargetWeight key="target-weight" />,
      completed: () => true,
      skip: () => !askDetails,
      showHeader: true,
      scrollView: false,
    },
    {
      screen: <OnboardingWeightChangeRate key="weight-change-rate" />,
      completed: () => true,
      skip: () => !askDetails,
      showHeader: true,
      scrollView: false,
    },
    {
      screen: (
        <GoalChangePreview
          key="preview"
          before={profile?.targets}
          after={computedTargets}
          goalDetailsMissing={goalDetailsMissing}
          onFillDetails={handleFillDetails}
        />
      ),
      completed: () => computedTargets !== undefined && !goalDetailsMissing,
      skip: () => false,
      showHeader: true,
      scrollView: true,
    },
  ];

  const currentStep = steps.at(step);
  const isLastStep = step === steps.length - 1;
  const isCurrentStepComplete = currentStep?.completed(context) ?? true;
  const isNextDisabled = !isCurrentStepComplete || isSaving;

  const visibleSteps = steps.filter((s) => !s.skip(context));
  const visibleIndex = currentStep ? visibleSteps.indexOf(currentStep) : 0;

  const handleSave = async () => {
    if (!profile?.data || !data.goal || computedTargets === undefined) return;
    if (isSaving) return;
    if (needsGoalDetails(data)) {
      Toast.show({ text: "Укажите целевой вес и темп", variant: "error" });
      return;
    }

    setIsSaving(true);
    const { targetWeight, weightChangeRate } = normalizeGoalDetails(data);

    const { error } = await tryCatch(
      updateProfile({
        profile: {
          data: {
            ...profile.data,
            goal: data.goal,
            targetWeight,
            weightChangeRate,
          },
          targets: computedTargets,
        },
      }),
    );

    if (error) {
      Toast.show({
        text: "Не удалось сохранить цель. Попробуйте ещё раз",
        variant: "error",
      });
      setIsSaving(false);
      return;
    }

    Toast.show({
      text: "Цель обновлена, нормы пересчитаны",
      variant: "success",
    });
    setIsSaving(false);
    router.back();
  };

  const handleNext = async () => {
    if (isNextDisabled) return;

    if (isLastStep) {
      await handleSave();
      return;
    }

    transitionDirection.value = 1;

    let needs = askDetails;
    if (step === 0) {
      if (data.goal === "maintain") {
        needs = false;
        setData((prev) => ({ ...prev, ...normalizeGoalDetails(prev) }));
      } else {
        needs = needsGoalDetails(data);
        if (needs) {
          setData((prev) => ({ ...prev, ...normalizeGoalDetails(prev) }));
        }
      }
      setAskDetails(needs);
    }

    // Шаги 2-3 (индексы 1-2) показываются только при доспросе.
    const nextStep = !needs && step === 0 ? steps.length - 1 : step + 1;
    setStep(nextStep);
  };

  const handleBack = () => {
    transitionDirection.value = -1;

    let prevStep = step - 1;
    while (prevStep >= 0 && steps.at(prevStep)?.skip(context)) {
      prevStep -= 1;
    }
    if (prevStep < 0) {
      router.back();
      return;
    }
    setStep(prevStep);
  };

  const enteringAnimation = (
    values: EntryAnimationsValues,
  ): LayoutAnimation => {
    "worklet";
    return {
      initialValues: {
        originX:
          values.targetOriginX + values.windowWidth * transitionDirection.value,
      },
      animations: { originX: withTiming(values.targetOriginX) },
    };
  };

  const exitingAnimation = (values: ExitAnimationsValues): LayoutAnimation => {
    "worklet";
    return {
      initialValues: { originX: values.currentOriginX },
      animations: {
        originX: withTiming(
          values.currentOriginX +
            values.windowWidth * transitionDirection.value * -1,
        ),
      },
    };
  };

  const isAndroid = Platform.OS === "android";
  usePreventRemove(step !== 0 && isAndroid && !isSaving, () => {
    handleBack();
  });

  return (
    <OnboardingSectionLayout
      onNext={handleNext}
      onBack={handleBack}
      isNextDisabled={isNextDisabled}
      nextButtonText={isLastStep ? "Сохранить" : undefined}
    >
      <Animated.View
        key={`step-${step}`}
        style={styles.flex}
        entering={enteringAnimation}
        exiting={exitingAnimation}
      >
        <OnboardingStepLayout
          sectionName="Цель"
          numSteps={visibleSteps.length}
          currentStep={visibleIndex}
          showHeader={currentStep?.showHeader ?? true}
          scrollView={currentStep?.scrollView ?? true}
        >
          {currentStep?.screen}
        </OnboardingStepLayout>
      </Animated.View>
    </OnboardingSectionLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rows: { gap: 16 },
  missing: { gap: 8 },
});
