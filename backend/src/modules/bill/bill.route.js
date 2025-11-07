// import { Router } from "express";
// import { BillController } from "./bill.controller.js";
// import { validate } from "../../shared/middlewares/validate.js";
// import { authorize } from "../../shared/middlewares/auth.js";
// import {
//   createBillSchema,
//   updateBillSchema,
//   deleteBillSchema,
// } from "./bill.zod.js";

// const router = Router();

// // ➕ Create Bill (Quotation or Invoice)
// router.post(
//   "/",
//   authorize("create"),
//   validate(createBillSchema),
//   BillController.create
// );

// // 📋 Get All Bills
// router.get("/", authorize("read"), BillController.getAll);

// // 🔍 Get Single Bill by ID
// router.get("/:id", authorize("read"), BillController.getById);

// // 🔁 Convert Quotation → Invoice
// router.post("/:id/convert", authorize("update"), BillController.convertToInvoice);

// // 💰 Add Payment
// router.post("/:id/payment", authorize("update"), BillController.addPayment);

// // ✏️ Update Bill
// router.put(
//   "/:id",
//   authorize("update"),
//   validate(updateBillSchema),
//   BillController.update
// );

// // 🗑️ Soft Delete Bill
// router.delete(
//   "/:id",
//   authorize("delete"),
//   validate(deleteBillSchema),
//   BillController.softDelete
// );

// // 💀 Hard Delete Bill
// router.delete("/:id/hard", authorize("delete"), BillController.hardDelete);

// // ♻️ Restore Bill
// router.post("/:id/restore", authorize("update"), BillController.restore);

// export default router;


import { Router } from "express";
import { BillController } from "./bill.controller.js";
import { validate } from "../../shared/middlewares/validate.js";
import { authorize } from "../../shared/middlewares/auth.js";
import {
  createBillSchema,
  updateBillSchema,
  deleteBillSchema,
  paymentSchema,
} from "./bill.zod.js";

const router = Router();

/* ➕ Create Bill (Quotation / Invoice) */
router.post(
  "/",
  authorize("create"),
  validate(createBillSchema),
  BillController.create
);

/* 📋 Get All Bills */
router.get("/", authorize("read"), BillController.getAll);

/* 📊 Get Dashboard Stats */
router.get("/dashboard/stats", authorize("read"), BillController.getDashboardStats);

/* 📊 Get Sales Report */
router.get("/reports/sales", authorize("read"), BillController.getSalesReport);

/* 📊 Get Profit & Loss Report */
router.get("/reports/profit-loss", authorize("read"), BillController.getProfitLossReport);

/* 📊 Get Payment Collection Report */
router.get("/reports/payment-collection", authorize("read"), BillController.getPaymentCollectionReport);

/* 🔍 Get Bill by ID */
router.get("/:id", authorize("read"), BillController.getById);

/* ✏️ Update Bill */
router.put(
  "/:id",
  authorize("update"),
  validate(updateBillSchema),
  BillController.update
);

/* ♻️ Convert Quotation → Invoice */
router.post(
  "/:id/convert",
  authorize("update"),
  BillController.convertToInvoice
);

/* 💵 Add Payment */
router.post(
  "/:id/payment",
  authorize("update"),
  validate(paymentSchema),
  BillController.addPayment
);

/* 🗑️ Soft Delete */
router.delete(
  "/:id",
  authorize("delete"),
  validate(deleteBillSchema),
  BillController.softDelete
);

/* 💀 Hard Delete */
router.delete("/:id/hard", authorize("delete"), BillController.hardDelete);

/* 🔄 Restore Bill */
router.post("/:id/restore", authorize("update"), BillController.restore);

export default router;
