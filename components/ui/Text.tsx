import getColor from "@/lib/ui/getColor";
import resolveFontFamily, {
  FontFamilyName,
} from "@/lib/ui/resolveFontFamily";
import React from "react";
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
} from "react-native";

function TextWrapper({
  family,
  ...props
}: RNTextProps & { family?: FontFamilyName }) {
  const flat = StyleSheet.flatten<TextStyle>(props.style);
  const fontFamily = resolveFontFamily({
    weight: flat.fontWeight,
    style: flat.fontStyle,
    family,
  });

  const { fontWeight, ...rest } = flat;

  return (
    <RNText
      {...props}
      style={[{ fontFamily, includeFontPadding: false }, rest]}
    />
  );
}

export type FontSize =
  | "10"
  | "12"
  | "14"
  | "16"
  | "18"
  | "20"
  | "24"
  | "28"
  | "32"
  | "40"
  | "48";

export type FontWeight =
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

export type TextProps = {
  children: React.ReactNode;
  size?: FontSize;
  weight?: FontWeight;
  color?: string;
  family?: FontFamilyName;
} & RNTextProps;

export default function Text({
  size = "18",
  weight = "400",
  color = getColor("foreground"),
  family = "manrope",
  ...rest
}: TextProps) {
  const fontSize = Number(size);
  return (
    <TextWrapper
      {...rest}
      family={family}
      style={[{ fontSize, fontWeight: weight, color }, rest.style]}
    />
  );
}
