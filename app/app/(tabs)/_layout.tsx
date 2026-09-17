import Button from "@/components/ui/Button";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { HomeIcon, SettingsIcon } from "lucide-react-native";
import { PressableProps, StyleSheet, View } from "react-native";
import TabsAddOptions from "@/components/tabs/TabsAddOptions";

function TabBarButton(props: PressableProps) {
  return <Button {...props} />;
}
TabBarButton.displayName = "TabBarButton";

// theme прокидывается только для пересборки кэша useThemedStyles при
// переключении темы — сами значения ниже цветонезависимы, фон/градиент
// вычисляются отдельно через getColor(..., theme) в JSX.
const createStyles = (_theme: ThemeName) => ({
  tabBarStyle: {
    backgroundColor: "transparent" as const,
    borderTopWidth: 0,
    position: "absolute" as const,
    elevation: 0,
    paddingHorizontal: 25,
  },
  tabBarLabelStyle: {
    fontSize: 12,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default function TabLayout() {
  const { theme, isDark } = useThemeContext();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: getColor("foreground", undefined, theme),
          tabBarInactiveTintColor: getColor("mutedForeground", 0.5, theme),
          animation: "shift",
          tabBarStyle: styles.tabBarStyle,
          tabBarLabelStyle: styles.tabBarLabelStyle,
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarBackground: () => (
            <View style={styles.background} pointerEvents="none">
              <BlurView
                intensity={30}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={[
                  getColor("background", 0, theme),
                  getColor("background", 0.9, theme),
                ]}
                style={styles.gradient}
              />
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: "Главная",
            tabBarIcon: ({ color }) => (
              <HomeIcon color={color} strokeWidth={1.75} size={20} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            tabBarLabel: "",
            tabBarIcon: () => null,
            tabBarButton: () => <TabsAddOptions />,
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            tabBarLabel: "Настройки",
            tabBarIcon: ({ color }) => (
              <SettingsIcon color={color} strokeWidth={1.75} size={20} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
