// import { z } from "zod";

// export const createCustomerSchema = z.object({
//   customer_name: z.string().min(1, "Customer name is required"),
//   pincode: z.string().optional().nullable(),
//   phone: z.string().min(1, "Phone number is required"), // Allow shorter numbers
//   old_balance: z.coerce.number().optional().default(0),
//   advance: z.coerce.number().optional().default(0),
//   credit_limit: z.coerce.number().optional().default(0),
//   available_limit: z.coerce.number().optional().default(0),
//   balance: z.coerce.number().optional().default(0),
//   gst_pan_number: z.string().optional().nullable(),
//   // Allow these fields for BaseController
//   createdBy: z.string().optional(),
//   updatedBy: z.string().optional(),
// }).passthrough();


// export const updateCustomerSchema = createCustomerSchema.partial().passthrough();

// export const deleteCustomerSchema = z.object({}).passthrough(); // Empty object, ID comes from params


import { z } from "zod";

export const createCustomerSchema = z
  .object({
    customer_name: z.string().min(1, "Customer name is required"),

    customer_email: z
      .string()
      .email("Invalid email address")
      .optional()
      .nullable(),

    billing_address: z.string().optional().nullable(),

    pincode: z.string().optional().nullable(),

    phone: z
      .union([
        z.string().regex(/^\d{10,11}$/, "Phone number must be 10 digits (mobile) or 11 digits (landline)"),
        z.literal(""),
        z.null(),
        z.undefined(),
      ])
      .optional()
      .nullable(),

    old_balance: z.coerce.number().optional().default(0),

    advance: z.coerce.number().optional().default(0),

    credit_limit: z.coerce.number().optional().default(0),

    available_limit: z.coerce.number().optional().default(0),

    balance: z.coerce.number().optional().default(0),

    gst_pan_number: z.string().optional().nullable(),

    // Common fields for tracking
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
  })
  .passthrough();

export const updateCustomerSchema = createCustomerSchema.partial();

export const deleteCustomerSchema = z.object({}).passthrough();