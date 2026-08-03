import { generateObject } from "ai";
import { z } from "zod/v4";
import { analyzeMealConfig } from "./analyzeMealConfig";

const translationSchema = z.object({
  nameRu: z.string(),
  categoryRu: z.string().optional(),
});

export default async function translateFood({
  nameEn,
  categoryEn,
}: {
  nameEn: string;
  categoryEn?: string;
}): Promise<{ nameRu: string; categoryRu?: string }> {
  const { object } = await generateObject({
    model: analyzeMealConfig.namingModel,
    temperature: 0,
    schema: translationSchema,
    output: "object",
    schemaName: "FoodTranslation",
    schemaDescription: "Russian translation of food name and category.",
    system: `
      Translate the food name and category (if provided) from English to Russian.
      Keep the meaning precise for nutrition context.
      Return JSON: { nameRu, categoryRu }
    `,
    messages: [
      {
        role: "user",
        content: JSON.stringify({ nameEn, categoryEn }),
      },
    ],
  });

  return {
    nameRu: object.nameRu,
    categoryRu: object.categoryRu,
  };
}
