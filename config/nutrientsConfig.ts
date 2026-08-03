import { NutrientsType } from "@/convex/tables/mealItems";
import getColor from "@/lib/ui/getColor";

export type NutrientMetric = {
  id: string;
  label: string;
  unit: string;
  value: number;
  default: number;
  target: [number, number];
  max: number;
};

type NutrientCategory = {
  id: keyof NutrientsType;
  categoryLabel: string;
  themeColor: string;
  metrics: NutrientMetric[];
};

export const nutrientsData: NutrientCategory[] = [
  {
    id: "carbs",
    categoryLabel: "Углеводы и сахара",
    themeColor: getColor("carb"),
    metrics: [
      {
        id: "total",
        label: "Углеводы всего",
        unit: "g",
        value: 0,
        default: 0,
        target: [225, 325],
        max: 400,
      },
      {
        id: "net",
        label: "Чистые углеводы",
        unit: "g",
        value: 0,
        default: 0,
        target: [200, 300],
        max: 350,
      },
      {
        id: "fiber",
        label: "Клетчатка",
        unit: "g",
        value: 0,
        default: 0,
        target: [25, 40],
        max: 60,
      },
      {
        id: "sugar",
        label: "Сахара всего",
        unit: "g",
        value: 0,
        default: 0,
        target: [0, 50],
        max: 100,
      },
    ],
  },
  {
    id: "fats",
    categoryLabel: "Жиры и липиды",
    themeColor: getColor("fat"),
    metrics: [
      {
        id: "total",
        label: "Жиры всего",
        unit: "g",
        value: 0,
        default: 0,
        target: [44, 78],
        max: 120,
      },
      {
        id: "saturated",
        label: "Насыщенные",
        unit: "g",
        value: 0,
        default: 0,
        target: [0, 22],
        max: 50,
      },
      {
        id: "monounsaturated",
        label: "Мононенасыщенные",
        unit: "g",
        value: 0,
        default: 0,
        target: [25, 45],
        max: 80,
      },
      {
        id: "polyunsaturated",
        label: "Полиненасыщенные",
        unit: "g",
        value: 0,
        default: 0,
        target: [12, 22],
        max: 40,
      },
      {
        id: "trans",
        label: "Трансжиры",
        unit: "g",
        value: 0,
        default: 0,
        target: [0, 2],
        max: 5,
      },
      {
        id: "cholesterol",
        label: "Холестерин",
        unit: "mg",
        value: 0,
        default: 0,
        target: [0, 300],
        max: 600,
      },
    ],
  },
  {
    id: "protein",
    categoryLabel: "Белки",
    themeColor: getColor("protein"),
    metrics: [
      {
        id: "total",
        label: "Белки всего",
        unit: "g",
        value: 0,
        default: 0,
        target: [60, 150],
        max: 220,
      },
      {
        id: "leucine",
        label: "Лейцин",
        unit: "g",
        value: 0,
        default: 0,
        target: [3, 10],
        max: 15,
      },
      {
        id: "isoleucine",
        label: "Изолейцин",
        unit: "g",
        value: 0,
        default: 0,
        target: [1.5, 6],
        max: 10,
      },
      {
        id: "valine",
        label: "Валин",
        unit: "g",
        value: 0,
        default: 0,
        target: [2, 6],
        max: 10,
      },
      {
        id: "tryptophan",
        label: "Триптофан",
        unit: "g",
        value: 0,
        default: 0,
        target: [0.5, 1.5],
        max: 3,
      },
    ],
  },
  {
    id: "vitamins",
    categoryLabel: "Витамины",
    themeColor: getColor("purple"),
    metrics: [
      {
        id: "a",
        label: "Витамин A",
        unit: "µg",
        value: 0,
        default: 0,
        target: [700, 1500],
        max: 3000,
      },
      {
        id: "b12",
        label: "Витамин B12",
        unit: "µg",
        value: 0,
        default: 0,
        target: [2.4, 10],
        max: 25,
      },
      {
        id: "b9",
        label: "Фолат (B9)",
        unit: "µg",
        value: 0,
        default: 0,
        target: [400, 800],
        max: 1200,
      },
      {
        id: "c",
        label: "Витамин C",
        unit: "mg",
        value: 0,
        default: 0,
        target: [75, 200],
        max: 1000,
      },
      {
        id: "d",
        label: "Витамин D",
        unit: "IU",
        value: 0,
        default: 0,
        target: [600, 2000],
        max: 4000,
      },
      {
        id: "e",
        label: "Витамин E",
        unit: "mg",
        value: 0,
        default: 0,
        target: [15, 30],
        max: 50,
      },
      {
        id: "k",
        label: "Витамин K",
        unit: "µg",
        value: 0,
        default: 0,
        target: [90, 150],
        max: 300,
      },
    ],
  },
  {
    id: "minerals",
    categoryLabel: "Минералы",
    themeColor: getColor("blue"),
    metrics: [
      {
        id: "sodium",
        label: "Натрий",
        unit: "mg",
        value: 0,
        default: 0,
        target: [1500, 2300],
        max: 4000,
      },
      {
        id: "potassium",
        label: "Калий",
        unit: "mg",
        value: 0,
        default: 0,
        target: [3000, 4700],
        max: 6000,
      },
      {
        id: "magnesium",
        label: "Магний",
        unit: "mg",
        value: 0,
        default: 0,
        target: [320, 420],
        max: 800,
      },
      {
        id: "calcium",
        label: "Кальций",
        unit: "mg",
        value: 0,
        default: 0,
        target: [1000, 1500],
        max: 2500,
      },
      {
        id: "iron",
        label: "Железо",
        unit: "mg",
        value: 0,
        default: 0,
        target: [8, 18],
        max: 45,
      },
      {
        id: "zinc",
        label: "Цинк",
        unit: "mg",
        value: 0,
        default: 0,
        target: [11, 25],
        max: 40,
      },
    ],
  },
  {
    id: "other",
    categoryLabel: "Прочее",
    themeColor: getColor("foreground"),
    metrics: [
      {
        id: "water",
        label: "Вода",
        unit: "ml",
        value: 0,
        default: 0,
        target: [2000, 3500],
        max: 5000,
      },
      {
        id: "caffeine",
        label: "Кофеин",
        unit: "mg",
        value: 0,
        default: 0,
        target: [0, 400],
        max: 600,
      },
      {
        id: "alcohol",
        label: "Алкоголь",
        unit: "g",
        value: 0,
        default: 0,
        target: [0, 15],
        max: 100,
      },
    ],
  },
];

export const getEmptyNutrients = (): NutrientsType => {
  return nutrientsData.reduce((acc, category) => {
    const categoryData = category.metrics.reduce<Record<string, number>>(
      (mAcc, metric) => {
        mAcc[metric.id] = metric.default;
        return mAcc;
      },
      {}
    );

    (acc as unknown as Record<string, Record<string, number>>)[category.id] =
      categoryData;
    return acc;
  }, {} as NutrientsType);
};

export function addNutrients(
  a: NutrientsType,
  b: NutrientsType
): NutrientsType {
  return nutrientsData.reduce((acc, category) => {
    const catId = category.id;
    const subA = a[catId] as Record<string, number>;
    const subB = b[catId] as Record<string, number>;

    const categoryData = category.metrics.reduce<Record<string, number>>(
      (mAcc, metric) => {
        const valA = subA[metric.id] ?? 0;
        const valB = subB[metric.id] ?? 0;
        mAcc[metric.id] = valA + valB;
        return mAcc;
      },
      {}
    );

    (acc as unknown as Record<string, Record<string, number>>)[catId] =
      categoryData;
    return acc;
  }, {} as NutrientsType);
}

export function multiplyNutrients(
  a: NutrientsType,
  ratio: number
): NutrientsType {
  return nutrientsData.reduce((acc, category) => {
    const catId = category.id;
    const subA = a[catId] as Record<string, number>;

    const categoryData = category.metrics.reduce<Record<string, number>>(
      (mAcc, metric) => {
        const valA = subA[metric.id] ?? 0;
        mAcc[metric.id] = valA * ratio;
        return mAcc;
      },
      {}
    );

    (acc as unknown as Record<string, Record<string, number>>)[catId] =
      categoryData;
    return acc;
  }, {} as NutrientsType);
}

export function getTargets(category: string, metric: string): [number, number] {
  const categoryData = nutrientsData.find((cat) => cat.id === category);
  if (!categoryData) return [0, 0];

  const metricData = categoryData.metrics.find((met) => met.id === metric);
  if (!metricData) return [0, 0];

  return metricData.target;
}
