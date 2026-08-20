import { Doc } from "@/convex/_generated/dataModel";

export default function getFoodName(food: Doc<"foods"> | null): string {
  if (!food) return "Продукт недоступен";
  return food.name.ru ?? food.name.en;
}
