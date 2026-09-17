import { StatusBar } from "expo-status-bar";
import { useThemeContext } from "@/context/ThemeContext";

// `RootLayoutProvider` находится выше провайдера темы и не может вызвать
// хук напрямую — этот компонент существует, чтобы статус-бар мог следовать
// за активной темой.
export default function ThemedStatusBar() {
  const { isDark } = useThemeContext();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}
