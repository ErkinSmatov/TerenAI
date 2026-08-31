import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Интервал 30 минут обязан совпадать с MEAL_REMINDER_WINDOW_MINUTES из
// lib/notifications/reminderSchedule.ts: окно шире интервала приводит к
// попыткам двойной отправки (гасится дедупликацией, но создаёт лишнюю
// работу), уже интервала — к пропуску точек у части часовых поясов.
// Ежечасный интервал недостаточен: есть часовые пояса со смещением в 30 и
// 45 минут, для них локальные 9:00 никогда не попали бы в границу часа.
crons.interval(
  "check weigh-in reminders",
  { minutes: 30 },
  internal.notifications.checkWeighInReminders.default
);

crons.interval(
  "check meal reminders",
  { minutes: 30 },
  internal.notifications.checkMealReminders.default
);

export default crons;
