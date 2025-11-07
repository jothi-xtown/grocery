import { z } from "zod";

export const createBranchSchema = z.object({
  branchName: z.string().min(1).max(255),
  phone: z
    .union([
      z.string().regex(/^\d{10,11}$/, "Phone number must be 10 digits (mobile) or 11 digits (landline)"),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .nullable(),
  email: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.string().email("Invalid email address").nullable().optional()
  ),
  address: z.string().min(1),
  // These are handled by BaseController, but allow them in schema for flexibility
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

export const deleteBranchSchema = z.object({});
