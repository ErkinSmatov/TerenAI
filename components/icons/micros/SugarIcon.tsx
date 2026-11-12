import { type LucideProps, CandyIcon } from "lucide-react-native";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "../../../lib/ui/getColor";

export default function SugarIcon(props: LucideProps) {
  const { theme } = useThemeContext();
  return <CandyIcon color={getColor("sugar", undefined, theme)} {...props} />;
}
