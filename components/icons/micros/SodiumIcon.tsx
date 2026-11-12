import { type LucideProps, WavesIcon } from "lucide-react-native";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "../../../lib/ui/getColor";

export default function SodiumIcon(props: LucideProps) {
  const { theme } = useThemeContext();
  return <WavesIcon color={getColor("sodium", undefined, theme)} {...props} />;
}
