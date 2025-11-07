import { Router } from "express";
import { productController } from "./product.controller.js";
import { validate } from "../../shared/middlewares/validate.js";
import { authorize } from "../../shared/middlewares/auth.js";
import {
  createProductSchema,
  updateProductSchema,
  deleteProductSchema,
} from "./product.zod.js";

const router = Router();

router.post(
  "/",
  authorize("create"),
  validate(createProductSchema),
  productController.create
);
router.get("/", authorize("read"), productController.getAll);
router.get("/:id", authorize("read"), productController.getById);
router.put(
  "/:id",
  authorize("update"),
  validate(updateProductSchema),
  productController.update
);
router.delete("/:id/hard", authorize("delete"), productController.hardDelete);
router.delete(
  "/:id",
  authorize("delete"),
  validate(deleteProductSchema),
  productController.softDelete
);
router.post("/:id/restore", authorize("update"), productController.restore);

export default router;

