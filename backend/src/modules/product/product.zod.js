import { z } from "zod";

export const createProductSchema = z.object({
  productName: z.string().min(1).max(255),
  hsn_sac_code: z.string().max(20).optional().nullable(),
  hasGST: z.boolean().optional().default(false),
  gstPercent: z.number().min(0).max(100).optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  piecePrice: z.number().min(0).optional().nullable(),
  pieceSalesPrice: z.number().min(0).optional().nullable(),
  purchasePrice: z.number().min(0).optional().nullable(),
  salesPrice: z.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  availability: z.enum(["Yes", "No"]).optional().default("Yes"),
  lowQtyIndication: z.number().min(0).optional().nullable(),
  unitQuantity: z.number().min(0).optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  // These are handled by BaseController, but allow them in schema for flexibility
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
}).passthrough(); // Allow additional fields that might be sent

export const updateProductSchema = createProductSchema.partial();

export const deleteProductSchema = z.object({});

