import { z } from "zod";

export const createUnitSchema = z.object({
  unitName: z.string().min(1).max(255),
  unitStatus: z.boolean(),
});

export const updateUnitSchema = createUnitSchema.partial();

export const deleteUnitSchema = z.object({});
