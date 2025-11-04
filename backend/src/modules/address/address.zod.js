import { z } from "zod";

export const createAddressSchema = z.object({
  addressBill: z.string().min(1).max(255),
  addressShip: z.string().min(1).max(255),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  email: z.string().email().max(255),
  // Allow these fields for BaseController
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
}).passthrough();

export const updateAddressSchema = createAddressSchema.partial().passthrough();

export const deleteAddressSchema = z.object({}).passthrough();
