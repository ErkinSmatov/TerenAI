import { DrumstickIcon, type LucideProps } from "lucide-react-native";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "../../../lib/ui/getColor";

export default function ProteinIcon(props: LucideProps) {
  const { theme } = useThemeContext();
  return <DrumstickIcon color={getColor("protein", undefined, theme)} {...props} />;
}
