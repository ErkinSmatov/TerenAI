import { FlameIcon, type LucideProps } from "lucide-react-native";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "../../../lib/ui/getColor";

export default function CalorieIcon(props: LucideProps) {
  const { theme } = useThemeContext();
  return <FlameIcon color={getColor("calorie", undefined, theme)} {...props} />;
}
