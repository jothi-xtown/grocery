import { Router } from "express";
import { CategoryController } from "./category.controller.js";
import { validate } from "../../shared/middlewares/validate.js";
import { authorize } from "../../shared/middlewares/auth.js";
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
} from "./category.zod.js";

const router = Router();

// ➕ Create Category
router.post(
  "/",
  authorize("create"),
  validate(createCategorySchema),
  CategoryController.create
);

// 📋 Get All Categories
router.get("/", authorize("read"), CategoryController.getAll);

// 🔍 Get Single Category
router.get("/:id", authorize("read"), CategoryController.getById);

// ✏️ Update Category
router.put(
  "/:id",
  authorize("update"),
  validate(updateCategorySchema),
  CategoryController.update
);

// 🗑️ Soft Delete Category
router.delete(
  "/:id",
  authorize("delete"),
  validate(deleteCategorySchema),
  CategoryController.softDelete
);

// 💀 Hard Delete Category
router.delete("/:id/hard", authorize("delete"), CategoryController.hardDelete);

// ♻️ Restore Category
router.post("/:id/restore", authorize("update"), CategoryController.restore);

export default router;
