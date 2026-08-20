export type LocalWeekBounds = {
  dayStartsUtc: number[];
  weekDates: string[];
};

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function getLocalWeekBounds(
  now: Date = new Date()
): LocalWeekBounds {
  const daysFromMonday = (now.getDay() + 6) % 7;

  const dayStartsUtc: number[] = [];
  const weekDates: string[] = [];

  for (let i = 0; i <= 7; i++) {
    const localDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysFromMonday + i
    );
    dayStartsUtc.push(localDate.getTime());
    if (i < 7) {
      weekDates.push(toLocalDateString(localDate));
    }
  }

  return { dayStartsUtc, weekDates };
}
