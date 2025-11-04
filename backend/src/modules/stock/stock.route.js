import { Router } from "express";
import { StockController } from "./stock.controllers.js";
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
  StockController.create
);

// 📋 Get All Stock Entries
router.get("/", authorize("read"), StockController.getAll);

// 🔍 Get Stock by ID
router.get("/:id", authorize("read"), StockController.getById);

// ✏️ Update Stock Entry
router.put(
  "/:id",
  authorize("update"),
  validate(updateStockSchema),
  StockController.update
);

// 🗑️ Soft Delete Stock
router.delete(
  "/:id",
  authorize("delete"),
  validate(deleteStockSchema),
  StockController.softDelete
);

// 💀 Hard Delete Stock
router.delete("/:id/hard", authorize("delete"), StockController.hardDelete);

// ♻️ Restore Soft Deleted Stock
router.post("/:id/restore", authorize("update"), StockController.restore);

export default router;
