import { HeartPulseIcon, type LucideProps } from "lucide-react-native";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "../../../lib/ui/getColor";

export default function HealthIcon(props: LucideProps) {
  const { theme } = useThemeContext();
  return <HeartPulseIcon color={getColor("health", undefined, theme)} {...props} />;
}
