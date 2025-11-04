import { Router } from "express";
import { CustomerController } from "./customer.controller.js";
import { validate } from "../../shared/middlewares/validate.js";
import { authorize } from "../../shared/middlewares/auth.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  deleteCustomerSchema,
} from "./customer.zod.js";

const router = Router();

// ➕ Create Customer
router.post(
  "/",
  authorize("create"),
  validate(createCustomerSchema),
  CustomerController.create
);

// 📋 Get All Customers
router.get("/", authorize("read"), CustomerController.getAll);

// 🔍 Get Single Customer by ID
router.get("/:id", authorize("read"), CustomerController.getById);

// ✏️ Update Customer
router.put(
  "/:id",
  authorize("update"),
  validate(updateCustomerSchema),
  CustomerController.update
);

// 🗑️ Soft Delete Customer
router.delete(
  "/:id",
  authorize("delete"),
  validate(deleteCustomerSchema),
  CustomerController.softDelete
);

// 💀 Hard Delete Customer
router.delete("/:id/hard", authorize("delete"), CustomerController.hardDelete);

// ♻️ Restore Customer
router.post("/:id/restore", authorize("update"), CustomerController.restore);

export default router;
