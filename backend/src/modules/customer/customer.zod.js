import { z } from "zod";

export const createCustomerSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  pincode: z.string().optional(),
  phone: z.string().min(10, "Phone number must be valid"),
  old_balance: z.number().nonnegative().optional(),
  advance: z.number().nonnegative().optional(),
  credit_limit: z.number().nonnegative().optional(),
  available_limit: z.number().nonnegative().optional(),
  balance: z.number().nonnegative().optional(),
  gst_pan_number: z.string().optional(),
});


export const updateCustomerSchema = createCustomerSchema.partial();

// export const deleteCustomerSchema = z.object({});

export const deleteCustomerSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});
