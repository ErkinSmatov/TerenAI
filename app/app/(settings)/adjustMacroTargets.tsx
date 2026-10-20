import Card from "@/components/ui/Card";
import CircularProgress from "@/components/ui/CircularProgress";
import {
  ScreenFooter,
  ScreenFooterButton,
} from "@/components/ui/screen/ScreenFooter";
import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenMain,
  ScreenMainScrollView,
} from "@/components/ui/screen/ScreenMain";
import Text from "@/components/ui/Text";
import { api } from "@/convex/_generated/api";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import getNutrientGlow from "@/lib/ui/getNutrientGlow";
import resolveFontFamily from "@/lib/ui/resolveFontFamily";
import {
  MACRO_TILE_DARK_BACKGROUND,
  MACRO_TILE_STYLES,
  type MacroTileStyle,
} from "@/lib/ui/macroTileStyles";
import macrosToKcal from "@/lib/utils/macrosToKcal";
import { useMutation, useQuery } from "convex/react";
import { Link, useRouter } from "expo-router";
import { ChevronRightIcon, TargetIcon } from "lucide-react-native";
import { formatGoalSummary } from "@/lib/goal/goalDetails";
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  cancelAnimation,
  SharedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const GRID_GAP = 12;
const GRID_PADDING = 16;

type Macro = MacroTileStyle & {
  name: string;
  value: number | undefined;
  setValue: React.Dispatch<React.SetStateAction<number | undefined>>;
  ratio: SharedValue<number>;
};

export default function AdjustMacroTargetsScreen() {
  const { theme } = useThemeContext();
  const { width: windowWidth } = useWindowDimensions();
  const profile = useQuery(api.profiles.getProfile.default);
  const targets = profile?.targets;
  const updateProfile = useMutation(api.profiles.updateProfile.default);

  const router = useRouter();

  const [calories, setCalories] = useState(targets?.calories);
  const [carbs, setCarbs] = useState(targets?.carbs);
  const [protein, setProtein] = useState(targets?.protein);
  const [fat, setFat] = useState(targets?.fat);

  const macrosCalories = macrosToKcal({ carbs, protein, fat });

  const caloriesRatio = useSharedValue(0);
  const carbsRatio = useSharedValue(0);
  const proteinRatio = useSharedValue(0);
  const fatRatio = useSharedValue(0);

  const macros: Macro[] = [
    {
      name: "Калории",
      ...MACRO_TILE_STYLES.calories,
      value: calories,
      setValue: setCalories,
      ratio: caloriesRatio,
    },
    {
      name: "Белки",
      ...MACRO_TILE_STYLES.protein,
      value: protein,
      setValue: setProtein,
      ratio: proteinRatio,
    },
    {
      name: "Углеводы",
      ...MACRO_TILE_STYLES.carbs,
      value: carbs,
      setValue: setCarbs,
      ratio: carbsRatio,
    },
    {
      name: "Жиры",
      ...MACRO_TILE_STYLES.fat,
      value: fat,
      setValue: setFat,
      ratio: fatRatio,
    },
  ];

  const handleDone = async () => {
    await updateProfile({
      profile: {
        targets: {
          calories: calories ?? 0,
          carbs: carbs ?? 0,
          protein: protein ?? 0,
          fat: fat ?? 0,
        },
      },
    });
    router.dismissTo("/app");
  };

  useEffect(() => {
    const calcRatio = (macros: Parameters<typeof macrosToKcal>[number]) => {
      "worklet";
      const calories = macrosToKcal(macros);
      const ratio = macrosCalories ? calories / macrosCalories : 0;
      return ratio;
    };

    const nextCaloriesRatio = Math.min(
      1,
      macrosCalories ? (calories ?? 0) / macrosCalories : 0
    );

    const duration = 1000;

    caloriesRatio.value = withTiming(nextCaloriesRatio, { duration });
    carbsRatio.value = withTiming(calcRatio({ carbs }), { duration });
    proteinRatio.value = withTiming(calcRatio({ protein }), { duration });
    fatRatio.value = withTiming(calcRatio({ fat }), { duration });

    return () => {
      cancelAnimation(carbsRatio);
      cancelAnimation(proteinRatio);
      cancelAnimation(fatRatio);
    };
  }, [
    calories,
    caloriesRatio,
    carbs,
    carbsRatio,
    fat,
    fatRatio,
    macrosCalories,
    protein,
    proteinRatio,
  ]);

  const inputFontFamily = resolveFontFamily({ family: "outfit" });
  const tileSize = (windowWidth - GRID_PADDING * 2 - GRID_GAP) / 2;

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Настроить цели" />
      </ScreenHeader>

      <ScreenMainScrollView safeAreaProps={{ edges: [] }}>
        <View style={styles.goalContainer}>
          <Link href="/app/(settings)/changeGoal" asChild>
            <Pressable>
              <Card style={styles.goalCard}>
                <TargetIcon
                  size={22}
                  color={getColor("foreground", undefined, theme)}
                />
                <View style={styles.goalText}>
                  <Text size="12" color={getColor("foreground", 0.6, theme)}>
                    Моя цель
                  </Text>
                  <Text size="16" weight="600">
                    {profile?.data ? formatGoalSummary(profile.data) : "Цель"}
                  </Text>
                </View>
                <ChevronRightIcon
                  size={20}
                  color={getColor("foreground", 0.6, theme)}
                />
              </Card>
            </Pressable>
          </Link>
        </View>
        <View style={styles.grid}>
          {macros.map((macro) => (
            <View
              key={`macro-tile-${macro.name}`}
              style={[
                styles.tile,
                { width: tileSize, height: tileSize },
                {
                  backgroundColor:
                    theme === "dark"
                      ? MACRO_TILE_DARK_BACKGROUND
                      : getColor("base", undefined, theme),
                },
                getNutrientGlow(theme, macro.glow.dark, macro.glow.light),
              ]}
            >
              <View style={styles.ring}>
                <CircularProgress
                  progress={macro.ratio}
                  gradientColors={macro.ringColors[theme]}
                  trackColor={getColor("foreground", 0.12, theme)}
                  strokeWidth={8}
                />
              </View>
              <View style={styles.center} pointerEvents="box-none">
                <TextInput
                  value={String(macro.value ?? "")}
                  inputMode="numeric"
                  keyboardType="number-pad"
                  maxLength={5}
                  selectTextOnFocus
                  placeholder="0"
                  placeholderTextColor={getColor("foreground", 0.3, theme)}
                  onChangeText={(text) => {
                    const numberText = text.replace(/[^0-9]/g, "");
                    macro.setValue(
                      numberText === "" ? undefined : Number(numberText)
                    );
                  }}
                  style={[
                    styles.input,
                    {
                      fontFamily: inputFontFamily,
                      color: getColor("foreground", undefined, theme),
                    },
                  ]}
                />
                <Text size="12" color={getColor("foreground", 0.6, theme)}>
                  {macro.name}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScreenMainScrollView>

      <ScreenFooter style={styles.footer}>
        <ScreenFooterButton
          variant="outline"
          style={{ flex: 0 }}
          onPress={() => {
            router.navigate("/app/(settings)/generateMacroTargets");
          }}
        >
          Сгенерировать автоматически
        </ScreenFooterButton>
        <ScreenFooterButton
          style={{ flex: 0 }}
          onPress={() => void handleDone()}
        >
          Готово
        </ScreenFooterButton>
      </ScreenFooter>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  goalContainer: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: GRID_GAP,
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  goalText: {
    flex: 1,
    gap: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    paddingHorizontal: GRID_PADDING,
  },
  tile: {
    borderRadius: 24,
    padding: 14,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    margin: 14,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    fontSize: 42,
    lineHeight: 48,
    minWidth: 90,
    textAlign: "center",
    padding: 0,
    includeFontPadding: false,
  },
  footer: {
    flexDirection: "column",
  },
});
