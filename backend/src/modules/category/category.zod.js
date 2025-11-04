import { z } from "zod";

export const createCategorySchema = z.object({
  categoryName: z.string().min(1).max(255),
  categoryStatus: z.boolean(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const deleteCategorySchema = z.object({});
