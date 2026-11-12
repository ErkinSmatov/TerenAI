import { type LucideProps, WheatIcon } from "lucide-react-native";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "../../../lib/ui/getColor";

export default function CarbIcon(props: LucideProps) {
  const { theme } = useThemeContext();
  return <WheatIcon color={getColor("carb", undefined, theme)} {...props} />;
}
