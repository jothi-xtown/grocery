import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  orderNumber: z.string().optional(), // Auto-generated if not provided
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Order date must be in YYYY-MM-DD format"),
  supplierId: z.string().uuid("Invalid supplier ID"),
  addressId: z.string().uuid("Invalid address ID").optional().nullable(),
  shippingAddressId: z.string().uuid("Invalid shipping address ID").optional().nullable(),
  gstInclude: z.boolean().optional().default(false),
  gstPercent: z.number().min(0).max(100).optional().nullable(),
  status: z.enum(["pending", "received"]).optional().default("pending"),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().uuid("Invalid product ID"),
    unitPrice: z.number().min(0).optional(),
    rate: z.number().min(0).optional(), // Frontend sends 'rate', map to unitPrice
    unitQuantity: z.number().min(0),
    totalQuantity: z.number().min(0).optional().nullable(),
    total: z.number().min(0),
  })).optional().default([]),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
}).passthrough();

// Update schema - make all fields optional and allow flexible date formats
export const updatePurchaseOrderSchema = z.object({
  orderNumber: z.string().optional(),
  orderDate: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Order date must be in YYYY-MM-DD format"),
    z.string().transform((val) => {
      // Try to parse and format string dates
      if (val && typeof val === 'string') {
        // If already in YYYY-MM-DD format, return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
          return val;
        }
        // Try to parse other formats
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      return val;
    }),
    z.date().transform((val) => {
      // Transform Date objects to YYYY-MM-DD format
      if (val instanceof Date) {
        return val.toISOString().split('T')[0];
      }
      return val;
    }),
  ]).optional(),
  supplierId: z.string().uuid("Invalid supplier ID").optional(),
  addressId: z.string().uuid("Invalid address ID").optional(),
  shippingAddressId: z.string().uuid("Invalid shipping address ID").optional().nullable(),
  gstInclude: z.boolean().optional(),
  gstPercent: z.number().min(0).max(100).optional().nullable(),
  status: z.enum(["pending", "received"]).optional(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().uuid("Invalid product ID"),
    unitPrice: z.number().min(0).optional(),
    rate: z.number().min(0).optional(),
    unitQuantity: z.number().min(0),
    totalQuantity: z.number().min(0).optional().nullable(),
    total: z.number().min(0),
  })).optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
}).passthrough();

export const deletePurchaseOrderSchema = z.object({});

export const generateRefSchema = z.object({});

