import { Router } from "express";
import { BranchController } from "./branch.controller.js";
import { validate } from "../../shared/middlewares/validate.js";
import { authorize } from "../../shared/middlewares/auth.js";
import {
  createBranchSchema,
  updateBranchSchema,
  deleteBranchSchema,
} from "./branch.zod.js";

const router = Router();

router.post(
  "/",
  authorize("create"),
  validate(createBranchSchema),
  BranchController.create
);
router.get("/", authorize("read"), BranchController.getAll);
router.get("/:id", authorize("read"), BranchController.getById);
router.put(
  "/:id",
  authorize("update"),
  validate(updateBranchSchema),
  BranchController.update
);
router.delete(
  "/:id",
  authorize("delete"),
  validate(deleteBranchSchema),
  BranchController.softDelete
);
router.delete("/:id/hard", authorize("delete"), BranchController.hardDelete);
router.post("/:id/restore", authorize("update"), BranchController.restore);

export default router;
