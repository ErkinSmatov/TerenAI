import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import { StyleSheet, View } from "react-native";

type Props = {
  size?: number;
  color?: string;
}

export default function Dot1Icon({
  size = 24,
  color: colorProp,
}: Props) {
  const { theme } = useThemeContext();
  const color = colorProp ?? getColor("foreground", undefined, theme);
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: "60%",
    height: "60%",
    borderRadius: 999,
  },
});
