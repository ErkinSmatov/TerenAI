import { generateObject } from "ai";
import { z } from "zod/v4";
import { analyzeMealConfig, analyzeMealPrompts } from "./analyzeMealConfig";
import logError from "@/lib/utils/logError";
import { DetectedMeal } from "./detectMealItems";

const detectionSchema = z.object({
  mealName: z
    .string()
    .describe("Short, appetizing, generic meal name in Russian"),
  items: z.array(
    z.object({
      name: z
        .string()
        .min(1)
        .describe(
          "Concise, generic English ingredient name (no brands) — used for database lookup, never shown to the user"
        ),
      nameRu: z
        .string()
        .min(1)
        .describe("The same ingredient name in Russian, shown to the user"),
      grams: z.number().int().min(1).max(1500),
    })
  ),
});

type Params = {
  description: string;
};

export default async function detectMealItemsFromText({
  description,
}: Params): Promise<DetectedMeal> {
  try {
    const { object: detected } = await generateObject({
      model: analyzeMealConfig.imageProcessingModel,
      temperature: analyzeMealConfig.temperature,
      output: "object",
      schema: detectionSchema,
      schemaName: "DetectedMealFromText",
      schemaDescription: "Meal name and ingredients from a text description.",
      system: analyzeMealPrompts.detectText,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: description }],
        },
      ],
    });

    return detected;
  } catch (error) {
    logError("detectMealItemsFromText error", error);
    throw error;
  }
}
