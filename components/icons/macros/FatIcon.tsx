import { type LucideProps } from "lucide-react-native";
import { useThemeContext } from "@/context/ThemeContext";
import getColor from "../../../lib/ui/getColor";
import { IconAvocado } from "@tabler/icons-react-native";

export default function FatIcon(props: LucideProps) {
  const { theme } = useThemeContext();
  return <IconAvocado color={getColor("fat", undefined, theme)} {...props} />;
}
