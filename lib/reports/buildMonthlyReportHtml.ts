import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

type MonthlyReport = FunctionReturnType<typeof api.reports.getMonthlyReport.default>;

const goalTrackNames: Record<string, string> = {
  biohacking: "Биохакинг",
  glucometer: "Контроль глюкозы",
  weightControl: "Контроль веса",
};

function formatDate(dateString: string): string {
  const [, month, day] = dateString.split("-");
  return `${day}.${month}`;
}

function round(value: number | null, digits = 0): string {
  if (value === null) return "—";
  return value.toFixed(digits);
}

function percent(part: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>]/g, (char) => htmlEscapes[char] ?? char);
}

export default function buildMonthlyReportHtml(
  report: MonthlyReport,
  generatedForDate = new Date()
): string {
  const { days, targets, nutrientTotals, glucose, bloodPressure } = report;

  const totalCalories = days.reduce((sum, d) => sum + d.calories, 0);
  const daysWithMeals = days.filter((d) => d.mealsCount > 0);
  const avgCalories =
    daysWithMeals.length === 0 ? null : totalCalories / daysWithMeals.length;
  const avgProtein =
    daysWithMeals.length === 0
      ? null
      : daysWithMeals.reduce((sum, d) => sum + d.protein, 0) /
        daysWithMeals.length;
  const avgCarbs =
    daysWithMeals.length === 0
      ? null
      : daysWithMeals.reduce((sum, d) => sum + d.carbs, 0) /
        daysWithMeals.length;
  const avgFat =
    daysWithMeals.length === 0
      ? null
      : daysWithMeals.reduce((sum, d) => sum + d.fat, 0) / daysWithMeals.length;
  const daysOverCalorieTarget = daysWithMeals.filter(
    (d) => d.calories > targets.calories
  ).length;

  const goalTrackLabel = report.goalTrack
    ? (goalTrackNames[report.goalTrack] ?? report.goalTrack)
    : null;

  const dailyRows = days
    .map((day) => {
      const glucoseCell =
        day.glucoseAvgMmolL === null
          ? "—"
          : `${round(day.glucoseAvgMmolL, 1)} ммоль/л${
              day.glucoseOutOfRangeCount > 0
                ? ` <span class="warn">(${day.glucoseOutOfRangeCount} вне нормы)</span>`
                : ""
            }`;
      const bpCell =
        day.bpSystolicAvg === null
          ? "—"
          : `${round(day.bpSystolicAvg)}/${round(day.bpDiastolicAvg)}`;
      const movementCell =
        day.steps === null ? "—" : day.steps.toLocaleString("ru-RU");

      return `<tr>
        <td>${formatDate(day.date)}</td>
        <td>${day.mealsCount > 0 ? round(day.calories) : "—"}</td>
        <td>${day.mealsCount > 0 ? round(day.protein) : "—"}</td>
        <td>${day.mealsCount > 0 ? round(day.carbs) : "—"}</td>
        <td>${day.mealsCount > 0 ? round(day.fat) : "—"}</td>
        <td>${day.mealsCount > 0 ? round(day.fiber) : "—"}</td>
        ${glucose ? `<td>${glucoseCell}</td>` : ""}
        ${bloodPressure ? `<td>${bpCell}</td>` : ""}
        <td>${movementCell}</td>
      </tr>`;
    })
    .join("\n");

  const nutrientRow = (label: string, value: number, unit: string) =>
    `<tr><td>${label}</td><td>${round(value, 1)} ${unit}</td><td>${round(
      value / Math.max(report.loggedDaysCount, 1),
      1
    )} ${unit}</td></tr>`;

  const nutrientsSection = nutrientTotals
    ? `<h2>Витамины и минералы</h2>
       <p class="muted">Сумма за период и среднее за день с логами (${report.loggedDaysCount} дн.)</p>
       <table>
         <thead><tr><th>Нутриент</th><th>Всего за месяц</th><th>В среднем за день</th></tr></thead>
         <tbody>
           ${nutrientRow("Витамин A", nutrientTotals.vitamins.a, "мкг")}
           ${nutrientRow("Витамин B12", nutrientTotals.vitamins.b12, "мкг")}
           ${nutrientRow("Витамин B9 (фолиевая)", nutrientTotals.vitamins.b9, "мкг")}
           ${nutrientRow("Витамин C", nutrientTotals.vitamins.c, "мг")}
           ${nutrientRow("Витамин D", nutrientTotals.vitamins.d, "мкг")}
           ${nutrientRow("Витамин E", nutrientTotals.vitamins.e, "мг")}
           ${nutrientRow("Витамин K", nutrientTotals.vitamins.k, "мкг")}
           ${nutrientRow("Калий", nutrientTotals.minerals.potassium, "мг")}
           ${nutrientRow("Магний", nutrientTotals.minerals.magnesium, "мг")}
           ${nutrientRow("Кальций", nutrientTotals.minerals.calcium, "мг")}
           ${nutrientRow("Железо", nutrientTotals.minerals.iron, "мг")}
           ${nutrientRow("Цинк", nutrientTotals.minerals.zinc, "мг")}
         </tbody>
       </table>`
    : "";

  const glucoseSection = glucose
    ? `<div class="card">
         <div class="card-title">Глюкоза</div>
         <div class="card-value">${percent(glucose.inRangeCount, glucose.readingsCount)}</div>
         <div class="card-hint">измерений в норме (${glucose.readingsCount} всего)</div>
       </div>`
    : "";

  const bpSection = bloodPressure
    ? `<div class="card">
         <div class="card-title">Давление</div>
         <div class="card-value">${round(bloodPressure.avgSystolic)}/${round(bloodPressure.avgDiastolic)}</div>
         <div class="card-hint">в среднем, пульс ${round(bloodPressure.avgPulse)}</div>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    padding: 32px;
  }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin-top: 28px; margin-bottom: 8px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
  .muted { color: #666; font-size: 11px; margin-bottom: 8px; }
  .cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
  .card {
    border: 1px solid #e2e2e2;
    border-radius: 10px;
    padding: 12px 16px;
    min-width: 140px;
    flex: 1;
  }
  .card-title { font-size: 11px; color: #666; }
  .card-value { font-size: 20px; font-weight: 600; margin: 4px 0; }
  .card-hint { font-size: 10px; color: #888; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th, td { padding: 5px 6px; border-bottom: 1px solid #eee; text-align: left; }
  th { color: #666; font-weight: 600; background: #f7f7f7; }
  .warn { color: #c0392b; }
  .footer { margin-top: 24px; color: #999; font-size: 10px; }
</style>
</head>
<body>
  <h1>Отчёт о питании и здоровье</h1>
  <div class="subtitle">
    Период: ${formatDate(days[0].date)}–${formatDate(days[days.length - 1].date)}
    ${goalTrackLabel ? ` · Режим: ${escapeHtml(goalTrackLabel)}` : ""}
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-title">Дней с логами</div>
      <div class="card-value">${report.loggedDaysCount}/${report.totalDays}</div>
      <div class="card-hint">${daysOverCalorieTarget} дн. выше цели по калориям</div>
    </div>
    <div class="card">
      <div class="card-title">Ср. калории</div>
      <div class="card-value">${round(avgCalories)}</div>
      <div class="card-hint">цель ${targets.calories} ккал</div>
    </div>
    <div class="card">
      <div class="card-title">Ср. БЖУ</div>
      <div class="card-value">${round(avgProtein)}/${round(avgCarbs)}/${round(avgFat)}</div>
      <div class="card-hint">белки/углеводы/жиры, г</div>
    </div>
    ${glucoseSection}
    ${bpSection}
  </div>

  <h2>По дням</h2>
  <table>
    <thead>
      <tr>
        <th>Дата</th>
        <th>Ккал</th>
        <th>Белки</th>
        <th>Угл.</th>
        <th>Жиры</th>
        <th>Клетч.</th>
        ${glucose ? "<th>Глюкоза</th>" : ""}
        ${bloodPressure ? "<th>Давление</th>" : ""}
        <th>Шаги</th>
      </tr>
    </thead>
    <tbody>
      ${dailyRows}
    </tbody>
  </table>

  ${nutrientsSection}

  <div class="footer">
    Сформировано в TerenAI ${generatedForDate.toLocaleDateString("ru-RU")}. Данные носят информационный характер и не являются медицинской рекомендацией.
  </div>
</body>
</html>`;
}
