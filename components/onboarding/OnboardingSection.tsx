import Description from "@/components/ui/Description";
import Header from "@/components/ui/Header";
import Title from "@/components/ui/Title";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Text from "@/components/ui/Text";
import getColor from "@/lib/ui/getColor";
import { useThemeContext } from "@/context/ThemeContext";
import { CheckIcon } from "lucide-react-native";
import { useState } from "react";
import SafeArea from "../ui/SafeArea";

const sections = [
  {
    title: "Основы",
    description:
      "Начнём со знакомства с вами и вашим метаболизмом, чтобы заложить основу персональной программы.",
  },
  {
    title: "Цель",
    description:
      "Определите свою цель, и TerenAI составит программу, которая поможет её достичь.",
  },
  {
    title: "Программа",
    description:
      "Расскажите о своих пищевых предпочтениях и привычках тренировок, чтобы точно настроить вашу программу.",
  },
];

type Props = {
  section: number;
};

export default function OnboardingSection({ section: sectionNumber }: Props) {
  const { theme } = useThemeContext();
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);

  const handleRowLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, y, height } = event.nativeEvent.layout;
    const circleSize = 36;
    setPositions((prev) => {
      const next = [...prev];
      next[index] = { x: x + circleSize / 2, y: y + height / 2 };
      return next;
    });
  };

  return (
    <SafeArea style={styles.safeArea} edges={[]}>
      <Header style={styles.header}>
        <Title>Начнём!</Title>
        <Description>Ваша персональная программа уже готова</Description>
      </Header>
      <View style={styles.container}>
        {positions.length === sections.length &&
          positions.slice(0, -1).map((pos, index) => {
            const next = positions[index + 1];
            return (
              <View
                key={`line-${index}`}
                style={[
                  styles.line,
                  {
                    left: pos.x,
                    top: pos.y,
                    height: next.y - pos.y,
                    backgroundColor:
                      index < sectionNumber
                        ? getColor("foreground", undefined, theme)
                        : getColor("muted", undefined, theme),
                  },
                ]}
              />
            );
          })}
        {sections.map((section, index) => (
          <View
            key={`${section.title}-${index}`}
            style={styles.sectionContainer}
            onLayout={(event) => {
              handleRowLayout(index, event);
            }}
          >
            <View
              style={[
                styles.numberContainer,
                {
                  backgroundColor:
                    index <= sectionNumber
                      ? getColor("foreground", undefined, theme)
                      : getColor("muted", undefined, theme),
                },
              ]}
            >
              {index >= sectionNumber ? (
                <Text
                  weight="500"
                  color={
                    index <= sectionNumber
                      ? getColor("background", undefined, theme)
                      : getColor("foreground", undefined, theme)
                  }
                >
                  {index + 1}
                </Text>
              ) : (
                <CheckIcon
                  size={18}
                  strokeWidth={2.5}
                  color={getColor("background", undefined, theme)}
                />
              )}
            </View>
            <View style={styles.textContainer}>
              <Title
                size="16"
                style={{
                  color:
                    index === sectionNumber
                      ? getColor("foreground", undefined, theme)
                      : getColor("mutedForeground", undefined, theme),
                }}
              >
                {section.title}
              </Title>
              {index === sectionNumber && (
                <Description size="14">{section.description}</Description>
              )}
            </View>
          </View>
        ))}
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    paddingVertical: 24,
    flex: 1,
    gap: 36,
  },
  header: {
    alignItems: "center",
  },
  container: {
    flex: 1,
    gap: 28,
  },
  line: {
    position: "absolute",
    transform: [{ translateX: "-50%" }],
    width: 2,
  },
  sectionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  numberContainer: {
    height: 36,
    width: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
});
