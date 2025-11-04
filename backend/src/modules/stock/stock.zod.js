import { z } from "zod";

// ✅ Create Stock Schema
export const createStockSchema = z.object({
  productId: z
    .string({ required_error: "Product ID is required" })
    .uuid("Invalid product ID"),

  openingStock: z
    .number({ invalid_type_error: "Opening stock must be a number" })
    .nonnegative()
    .optional()
    .default(0),

  purchasedQty: z
    .number({ invalid_type_error: "Purchased quantity must be a number" })
    .nonnegative()
    .optional()
    .default(0),

  soldQty: z
    .number({ invalid_type_error: "Sold quantity must be a number" })
    .nonnegative()
    .optional()
    .default(0),

  currentStock: z
    .number({ invalid_type_error: "Current stock must be a number" })
    .nonnegative()
    .optional()
    .default(0),

  location: z
    .string()
    .max(255, "Location name too long")
    .optional()
    .nullable(),

  lastUpdated: z
    .string()
    .datetime({ message: "Invalid date format" })
    .optional()
    .nullable(),
  // Allow these fields for BaseController
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),

});

// ✅ Update Schema (Partial)
export const updateStockSchema = createStockSchema.partial();

// ✅ Delete Schema (empty object, ID comes from params)
export const deleteStockSchema = z.object({}).passthrough();
