// import { z } from "zod";

// export const createBillSchema = z.object({
//   billType: z.enum(["quotation", "invoice"]),
//   billNumber: z.string().optional(), // auto-generated can be optional
//   customerId: z.string().uuid("Invalid customer ID"),
//   date: z.string().datetime({ message: "Invalid date format" }),
//   dueDate: z.string().datetime({ message: "Invalid due date format" }).optional(),

//   items: z
//     .array(
//       z.object({
//         productId: z.string().uuid("Invalid product ID"),
//         quantity: z.number().positive(),
//         unitPrice: z.number().nonnegative(),
//         discount: z.number().min(0).max(100).optional(),
//         taxPercent: z.number().min(0).max(100).optional(),
//       })
//     )
//     .min(1, "At least one item is required"),

//   totalAmount: z.number().nonnegative(),
//   paidAmount: z.number().nonnegative().optional(),
//   paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional().default("unpaid"),
//   notes: z.string().optional(),
// });

// export const updateBillSchema = createBillSchema.partial();

// export const deleteBillSchema = z.object({
//   id: z.string().uuid("Invalid bill ID"),
// });


import { z } from "zod";

// ✅ Bill Item Schema
const billItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
});

// ✅ Create Bill Schema
export const createBillSchema = z.object({
  type: z.enum(["quotation", "invoice"]),
  customerId: z.string().uuid(),
  items: z.array(billItemSchema).min(1),
  remarks: z.string().max(255).optional(),
});

// ✅ Update Bill Schema
export const updateBillSchema = createBillSchema.partial();

// ✅ Delete Bill Schema
export const deleteBillSchema = z.object({});

// ✅ Payment Schema
export const paymentSchema = z.object({
  billId: z.string().uuid(),
  paymentMode: z.string().min(1),
  amountPaid: z.number().positive(),
  transactionId: z.string().optional(),
});
