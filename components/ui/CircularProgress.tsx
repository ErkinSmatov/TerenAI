import { useThemeContext } from "@/context/ThemeContext";
import getColor from "@/lib/ui/getColor";
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Skia,
  vec,
  type SkContourMeasure,
  type SkPath,
} from "@shopify/react-native-skia";
import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

type ProgressValue = number | SharedValue<number>;

// Опциональный маркер конца заполненной дуги (декоративная "ручка"-скраббер).
// Используется только кольцом калорий на Главной (Figma node 863:5405) —
// `HomeSummaryCardBig`/`HomeSummaryCard` не передают этот проп и рендерятся
// без изменений.
type EndCapConfig = {
  color: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
};

type GradientBounds = {
  start: { x: number; y: number };
  end: { x: number; y: number };
};

function CircularProgressItem({
  path,
  progress,
  previousProgresses,
  strokeWidth,
  color,
  gradientColors,
  gradientBounds,
  endCap,
}: {
  path: SkPath;
  progress: ProgressValue;
  previousProgresses: ProgressValue[];
  strokeWidth: number;
  color: string;
  gradientColors?: [string, string];
  gradientBounds?: GradientBounds;
  endCap?: EndCapConfig;
}) {
  const start = useDerivedValue(() => {
    let total = 0;
    for (const p of previousProgresses)
      total += typeof p === "number" ? p : p.value;
    return Math.min(Math.max(total, 0), 1);
  }, [previousProgresses]);

  const end = useDerivedValue(() => {
    const v = typeof progress === "number" ? progress : progress.value;
    return Math.min(Math.max(start.value + v, start.value), 1);
  }, [progress, start]);

  // Измеряется один раз на смену самого path (пересчёт radius/strokeWidth),
  // не на каждый кадр анимации — сам path не меняется во время анимации
  // прогресса, меняются только start/end (SharedValue).
  const contour: SkContourMeasure | null = useMemo(() => {
    if (!endCap) return null;
    const iter = Skia.ContourMeasureIter(path, false, 1);
    return iter.next();
  }, [path, endCap]);

  // Позиция "ручки" вычисляется через measurement API контура пути
  // (getPosTan), а не вручную через тригонометрию — так точка гарантированно
  // совпадает с видимым концом обводки независимо от transform на Group
  // (поворот -90deg), и не потребует правки при изменении этого transform.
  const endCapCenter = useDerivedValue(() => {
    "worklet";
    if (!contour) return { x: 0, y: 0 };
    const length = contour.length();
    const [pos] = contour.getPosTan(end.value * length);
    return { x: pos.x, y: pos.y };
  }, [contour, end]);

  return (
    <>
      <Path
        path={path}
        start={start}
        end={end}
        style="stroke"
        strokeCap="round"
        strokeWidth={strokeWidth}
        {...(gradientColors ? {} : { color })}
      >
        {gradientColors && gradientBounds ? (
          <LinearGradient
            start={vec(gradientBounds.start.x, gradientBounds.start.y)}
            end={vec(gradientBounds.end.x, gradientBounds.end.y)}
            colors={gradientColors}
          />
        ) : null}
      </Path>
      {endCap && contour ? (
        <>
          <Circle c={endCapCenter} r={endCap.radius} color={endCap.borderColor} />
          <Circle
            c={endCapCenter}
            r={Math.max(endCap.radius - endCap.borderWidth, 0)}
            color={endCap.color}
          />
        </>
      ) : null}
    </>
  );
}

type Props = {
  progress: ProgressValue | ProgressValue[];
  size?: number;
  strokeWidth?: number;
  color?: string | string[];
  trackColor?: string;
  // Декоративный градиент обводки вместо плоского `color` — опционально,
  // используется только кольцом калорий на Главной. Остальные потребители
  // не передают этот проп и продолжают рендериться с плоским цветом.
  gradientColors?: [string, string];
  // Маркер конца заполненной дуги — см. `EndCapConfig` выше.
  endCap?: EndCapConfig;
};

export default function CircularProgress({
  progress,
  size,
  strokeWidth = 8,
  color,
  trackColor,
  gradientColors,
  endCap,
}: Props) {
  const { theme } = useThemeContext();
  const [measured, setMeasured] = useState(0);
  const resolvedSize = size ?? measured;

  const resolvedColor = color ?? getColor("foreground", undefined, theme);
  const resolvedTrackColor =
    trackColor ??
    getColor("secondary", theme === "dark" ? 0.08 : undefined, theme);

  const onLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    if (size) return;
    const next = Math.ceil(
      Math.min(nativeEvent.layout.width, nativeEvent.layout.height)
    );
    if (next && next !== measured) setMeasured(next);
  };

  const circlePath = useMemo(() => {
    if (!resolvedSize) return null;
    const r = (resolvedSize - strokeWidth) / 2;
    const p = Skia.Path.Make();
    p.addCircle(resolvedSize / 2, resolvedSize / 2, r);
    return p;
  }, [resolvedSize, strokeWidth]);

  const progresses = Array.isArray(progress) ? progress : [progress];
  const colors = Array.isArray(resolvedColor) ? resolvedColor : [resolvedColor];

  // Диагональ ограничивающего квадрата пути (до поворота Group) — стабильные
  // координаты для градиента обводки, не зависят от анимации прогресса.
  const gradientBounds: GradientBounds | undefined = gradientColors
    ? { start: { x: 0, y: 0 }, end: { x: resolvedSize, y: resolvedSize } }
    : undefined;

  if (!resolvedSize || !circlePath) {
    return <View style={styles.container} onLayout={onLayout} />;
  }

  return (
    <View
      style={[styles.container, { height: resolvedSize, width: resolvedSize }]}
      onLayout={onLayout}
      pointerEvents="none"
    >
      <Canvas style={{ height: resolvedSize + 1, width: resolvedSize + 1 }}>
        <Group
          origin={{ x: resolvedSize / 2, y: resolvedSize / 2 }}
          transform={[{ rotate: -Math.PI / 2 }]}
        >
          <Path
            path={circlePath}
            style="stroke"
            color={resolvedTrackColor}
            strokeWidth={strokeWidth}
          />
          {progresses.map((p, i) => (
            <CircularProgressItem
              key={i}
              path={circlePath}
              progress={p}
              previousProgresses={progresses.slice(0, i)}
              strokeWidth={strokeWidth}
              color={
                colors.at(i) ??
                colors.at(0) ??
                getColor("foreground", undefined, theme)
              }
              gradientColors={gradientColors}
              gradientBounds={gradientBounds}
              endCap={i === progresses.length - 1 ? endCap : undefined}
            />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
  },
});
