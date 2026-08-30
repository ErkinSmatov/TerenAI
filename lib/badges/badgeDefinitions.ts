// Чистый модуль без зависимостей от convex/react/react-native — правило
// начисления бейджей должно быть тестируемо автотестом (69-VALIDATION.md),
// у Convex-действий и cron нет тестового harness в этом проекте.

export type BadgeType = "streak" | "mealCount";

export type BadgeDefinition = {
  type: BadgeType;
  threshold: number;
  name: string;
  description: string;
};

// D-16, D-17: пороги и тексты бейджей. Весь UI-текст хардкодится по-русски
// по конвенции проекта.
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: "streak",
    threshold: 7,
    name: "Неделя в строю",
    description: "7 дней подряд с записанными приёмами пищи",
  },
  {
    type: "streak",
    threshold: 30,
    name: "Месяц дисциплины",
    description: "30 дней подряд с записанными приёмами пищи",
  },
  {
    type: "streak",
    threshold: 100,
    name: "Сотня дней",
    description: "100 дней подряд с записанными приёмами пищи",
  },
  {
    type: "mealCount",
    threshold: 10,
    name: "Первый десяток",
    description: "10 записанных приёмов пищи",
  },
  {
    type: "mealCount",
    threshold: 50,
    name: "Полсотни",
    description: "50 записанных приёмов пищи",
  },
  {
    type: "mealCount",
    threshold: 100,
    name: "Сто приёмов",
    description: "100 записанных приёмов пищи",
  },
];

export function findBadgeDefinition(
  type: BadgeType,
  threshold: number
): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(
    (definition) => definition.type === type && definition.threshold === threshold
  );
}

// Идемпотентное начисление (T-69-04): повторный вызов с `awarded`,
// дополненным выданными бейджами, обязан вернуть пустой массив.
export function resolveNewBadges(input: {
  streak: number;
  mealCount: number;
  awarded: { type: BadgeType; threshold: number }[];
}): BadgeDefinition[] {
  const result: BadgeDefinition[] = [];

  for (const definition of BADGE_DEFINITIONS) {
    const currentValue =
      definition.type === "streak" ? input.streak : input.mealCount;

    const alreadyAwarded = input.awarded.some(
      (awarded) =>
        awarded.type === definition.type &&
        awarded.threshold === definition.threshold
    );

    if (currentValue >= definition.threshold && !alreadyAwarded) {
      result.push(definition);
    }
  }

  return result;
}
