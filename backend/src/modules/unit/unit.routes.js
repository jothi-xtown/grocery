import { Router } from "express";
import { UnitController } from "./unit.controller.js";
import { validate } from "../../shared/middlewares/validate.js";
import { authorize } from "../../shared/middlewares/auth.js";
import {
  createUnitSchema,
  updateUnitSchema,
  deleteUnitSchema,
} from "./unit.zod.js";

const router = Router();

// ➕ Create Unit
router.post(
  "/",
  authorize("create"),
  validate(createUnitSchema),
  UnitController.create
);

// 📋 Get All Units
router.get("/", authorize("read"), UnitController.getAll);

// 🔍 Get Single Unit
router.get("/:id", authorize("read"), UnitController.getById);

// ✏️ Update Unit
router.put(
  "/:id",
  authorize("update"),
  validate(updateUnitSchema),
  UnitController.update
);

// 🗑️ Soft Delete Unit
router.delete(
  "/:id",
  authorize("delete"),
  validate(deleteUnitSchema),
  UnitController.softDelete
);

// 💀 Hard Delete Unit
router.delete("/:id/hard", authorize("delete"), UnitController.hardDelete);

// ♻️ Restore Unit
router.post("/:id/restore", authorize("update"), UnitController.restore);

export default router;
