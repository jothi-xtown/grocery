import { Router } from "express";
import { stockController } from "./stock.controllers.js";
import { validate } from "../../shared/middlewares/validate.js";
import { authorize } from "../../shared/middlewares/auth.js";
import {
  createStockSchema,
  updateStockSchema,
  deleteStockSchema,
} from "./stock.zod.js";

const router = Router();

// ➕ Create Stock Entry
router.post(
  "/",
  authorize("create"),
  validate(createStockSchema),
  stockController.create
);

// 📋 Get All Stock Entries
router.get("/", authorize("read"), stockController.getAll);

// 🔍 Get Stock by ID
router.get("/:id", authorize("read"), stockController.getById);

// ✏️ Update Stock Entry
router.put(
  "/:id",
  authorize("update"),
  validate(updateStockSchema),
  stockController.update
);

// 🗑️ Soft Delete Stock
router.delete(
  "/:id",
  authorize("delete"),
  validate(deleteStockSchema),
  stockController.softDelete
);

// 💀 Hard Delete Stock
router.delete("/:id/hard", authorize("delete"), stockController.hardDelete);

// ♻️ Restore Soft Deleted Stock
router.post("/:id/restore", authorize("update"), stockController.restore);

export default router;
