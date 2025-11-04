import { Router } from "express";
import { purchaseOrderController } from "./purchaseOrder.controller.js";
import { validate } from "../../shared/middlewares/validate.js";
import { authorize } from "../../shared/middlewares/auth.js";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  deletePurchaseOrderSchema,
  generateRefSchema,
} from "./purchaseOrder.zod.js";

const router = Router();

router.post(
  "/",
  authorize("create"),
  validate(createPurchaseOrderSchema),
  purchaseOrderController.create
);
router.get("/", authorize("read"), purchaseOrderController.getAll);
router.get("/generate-ref", authorize("read"), purchaseOrderController.generateRef);
router.get("/:id", authorize("read"), purchaseOrderController.getById);
router.put(
  "/:id",
  authorize("update"),
  validate(updatePurchaseOrderSchema),
  purchaseOrderController.update
);
router.delete(
  "/:id",
  authorize("delete"),
  validate(deletePurchaseOrderSchema),
  purchaseOrderController.softDelete
);
router.delete("/:id/hard", authorize("delete"), purchaseOrderController.hardDelete);
router.post("/:id/restore", authorize("update"), purchaseOrderController.restore);

export default router;

