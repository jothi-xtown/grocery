import { z } from "zod";

export const createSupplierSchema = z.object({
  supplierName: z.string().min(1).max(255),
  gstNumber: z.string().max(255).optional(),
  phone: z.union([
    z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  email: z.union([
    z.string().email("Please enter a valid email"),
    z.literal(""),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  address: z.string().min(1).max(255),
  advancePaid: z.coerce.number().nonnegative().optional().default(0),
  oldBalance: z.coerce.number().nonnegative().optional().default(0),
  creditLimit: z.coerce.number().nonnegative().optional().default(0),
  availableLimit: z.coerce.number().nonnegative().optional().default(0),
  balance: z.coerce.number().optional().default(0),
  status: z.enum(["active", "inactive"]).optional(),
  // Allow these fields for BaseController
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
}).passthrough();

export const updateSupplierSchema = createSupplierSchema.partial().passthrough();

export const deleteSupplierSchema = z.object({}).passthrough();


