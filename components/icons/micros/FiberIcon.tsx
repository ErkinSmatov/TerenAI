import { type LucideProps, SproutIcon } from "lucide-react-native";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "../../../lib/ui/getColor";

export default function FiberIcon(props: LucideProps) {
  const { theme } = useThemeContext();
  return <SproutIcon color={getColor("fiber", undefined, theme)} {...props} />;
}
