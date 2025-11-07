import { z } from "zod";

export const createAddressSchema = z.object({
  addressBill: z.string().min(1).max(255),
  addressShip: z.string().min(1).max(255),
  phone: z
    .union([
      z.string().regex(/^\d{10,11}$/, "Phone number must be 10 digits (mobile) or 11 digits (landline)"),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .nullable(),
  email: z
    .union([
      z.string().email("Invalid email address"),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .nullable(),
  // Allow these fields for BaseController
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
}).passthrough();

export const updateAddressSchema = createAddressSchema.partial().passthrough();

export const deleteAddressSchema = z.object({}).passthrough();
