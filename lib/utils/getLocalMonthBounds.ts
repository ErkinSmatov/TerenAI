export type LocalMonthBounds = {
  dayStartsUtc: number[];
  monthDates: string[];
};

// Дублирует toLocalDateString из lib/utils/getLocalWeekBounds.ts и
// lib/health/healthKit.ts (третья копия). Общий хелпер намеренно не
// выносится в рамках этой фазы — это тронуло бы 3 файла из трёх разных
// планов.
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function getLocalMonthBounds(
  now: Date = new Date()
): LocalMonthBounds {
  const dayCount = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();

  const dayStartsUtc: number[] = [];
  const monthDates: string[] = [];

  for (let i = 0; i <= dayCount; i++) {
    const localDate = new Date(now.getFullYear(), now.getMonth(), 1 + i);
    dayStartsUtc.push(localDate.getTime());
    if (i < dayCount) {
      monthDates.push(toLocalDateString(localDate));
    }
  }

  return { dayStartsUtc, monthDates };
}
