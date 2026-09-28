import React from "react";
import Text, { TextProps, FontSize } from "./Text";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

type Props = {
  size?: FontSize;
} & TextProps

export default function Description({ size = "16", ...rest }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text {...rest} size={size} style={[styles.description, rest.style]} />
  );
}

const createStyles = (theme: ThemeName) => ({
  description: {
    color: getColor("mutedForeground", undefined, theme),
  },
});
