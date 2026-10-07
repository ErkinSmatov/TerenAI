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
import macrosToKcal from "@/lib/utils/macrosToKcal";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import {
  cancelAnimation,
  SharedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Figma node 1333:795 — плитки 2×2: плоский фон #15181F, цветное внутреннее
// свечение и кольцо с градиентом. Цвета фиксированные (литеральные hex из
// макета), как у hero-карточек Главной; светлая тема — мягкое амбиентное
// свечение того же оттенка (см. getNutrientGlow).
const TILE_DARK_BACKGROUND = "#15181F";
const GRID_GAP = 12;
const GRID_PADDING = 16;

type Macro = {
  name: string;
  ringColors: { dark: [string, string]; light: [string, string] };
  glow: { dark: string; light: string };
  value: number | undefined;
  setValue: React.Dispatch<React.SetStateAction<number | undefined>>;
  ratio: SharedValue<number>;
};

export default function AdjustMacroTargetsScreen() {
  const { theme } = useThemeContext();
  const { width: windowWidth } = useWindowDimensions();
  const targets = useQuery(api.profiles.getProfile.default)?.targets;
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
      ringColors: {
        dark: ["#EE6A22", "#FEE8D9"],
        light: ["#EE6A22", "#F8C7A6"],
      },
      glow: { dark: "#a78154", light: "rgba(167, 129, 84, 0.3)" },
      value: calories,
      setValue: setCalories,
      ratio: caloriesRatio,
    },
    {
      name: "Белки",
      ringColors: {
        dark: ["#FFFFFF", "#C9CCD2"],
        light: ["#4B5563", "#C9CCD2"],
      },
      glow: { dark: "#FFFFFF", light: "rgba(75, 85, 99, 0.2)" },
      value: protein,
      setValue: setProtein,
      ratio: proteinRatio,
    },
    {
      name: "Углеводы",
      ringColors: {
        dark: ["#F47F6E", "#F7F1E3"],
        light: ["#F47F6E", "#F9CFC8"],
      },
      glow: { dark: "#b84244", light: "rgba(184, 66, 68, 0.25)" },
      value: carbs,
      setValue: setCarbs,
      ratio: carbsRatio,
    },
    {
      name: "Жиры",
      ringColors: {
        dark: ["#8489DA", "#F7F1E3"],
        light: ["#8489DA", "#D3D5F1"],
      },
      glow: { dark: "#4772eb", light: "rgba(71, 114, 235, 0.25)" },
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
                      ? TILE_DARK_BACKGROUND
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
