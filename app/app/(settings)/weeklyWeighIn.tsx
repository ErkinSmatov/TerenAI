import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
} from "@/components/ui/screen/ScreenMain";
import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";
import { Toast } from "@/components/ui/Toast";
import WeightPicker from "@/components/weight/WeightPicker";
import { api } from "@/convex/_generated/api";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import getColor from "@/lib/ui/getColor";
import kgToLbs from "@/lib/units/kgToLbs";
import lbsToKg from "@/lib/units/lbsToKg";
import tryCatch from "@/lib/utils/tryCatch";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function WeeklyWeighInScreen() {
  const { scrollY, onScroll } = useScrollY();
  const router = useRouter();

  const profile = useQuery(api.profiles.getProfile.default);
  const updateProfile = useMutation(api.profiles.updateProfile.default);

  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.data && weightKg === null) {
      setWeightKg(profile.data.weight);
    }
  }, [profile, weightKg]);

  const computedTargets = useQuery(
    api.nutrition.computeNutritionTargets.default,
    profile?.data && weightKg !== null
      ? {
          sex: profile.data.sex,
          birthDate: profile.data.birthDate,
          height: profile.data.height,
          weight: weightKg,
          activityLevel: profile.data.activityLevel,
          weeklyWorkouts: profile.data.weeklyWorkouts,
          training: profile.data.training,
          goal: profile.data.goal,
          liftingExperience: profile.data.liftingExperience,
          cardioExperience: profile.data.cardioExperience,
          weightChangeRate: profile.data.weightChangeRate,
        }
      : "skip"
  );

  const isMetric = profile?.data?.measurementSystem === "metric";

  const handleSave = async () => {
    if (
      !profile?.data ||
      weightKg === null ||
      computedTargets === undefined ||
      isSaving
    ) {
      return;
    }

    setIsSaving(true);

    const { error } = await tryCatch(
      updateProfile({
        profile: {
          data: { ...profile.data, weight: weightKg },
          targets: computedTargets,
          weightUpdatedAt: Date.now(),
        },
      })
    );

    if (error) {
      Toast.show({
        text: "Не удалось сохранить вес. Попробуйте ещё раз",
        variant: "error",
      });
      setIsSaving(false);
      return;
    }

    Toast.show({ text: "Вес обновлён, цели пересчитаны", variant: "success" });
    setIsSaving(false);
    router.back();
  };

  const isSaveDisabled =
    !profile?.data ||
    weightKg === null ||
    computedTargets === undefined ||
    isSaving;

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Обновить вес" />
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right", "bottom"] }}
      >
        <View style={styles.pickerContainer}>
          {profile?.data &&
            (isMetric ? (
              <WeightPicker
                key="metric-weight"
                minWeight={30}
                maxWeight={300}
                initialWeight={Math.min(
                  Math.max(Math.round(profile.data.weight * 10) / 10, 30),
                  300
                )}
                formatWeight={(nextWeight: number) => {
                  "worklet";
                  return `${nextWeight} kg`;
                }}
                onChange={(nextWeight) => {
                  setWeightKg(nextWeight);
                }}
              />
            ) : (
              <WeightPicker
                key="imperial-weight"
                minWeight={70}
                maxWeight={700}
                initialWeight={Math.min(
                  Math.max(
                    Math.round(kgToLbs(profile.data.weight) * 10) / 10,
                    70
                  ),
                  700
                )}
                formatWeight={(nextWeight: number) => {
                  "worklet";
                  return `${nextWeight} lbs`;
                }}
                onChange={(nextWeight) => {
                  setWeightKg(lbsToKg(nextWeight));
                }}
              />
            ))}
        </View>

        <Text
          size="16"
          color={getColor("mutedForeground")}
          style={styles.helperText}
        >
          Цели по калориям и БЖУ пересчитаются автоматически
        </Text>

        <Button
          variant="primary"
          disabled={isSaveDisabled}
          onPress={() => void handleSave()}
          style={styles.button}
        >
          Сохранить вес
        </Button>
      </ScreenMainScrollView>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    height: 200,
  },
  helperText: {
    textAlign: "center",
    marginTop: 8,
  },
  button: {
    marginTop: 24,
    height: 48,
  },
});
