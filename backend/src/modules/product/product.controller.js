import Product from "./product.model.js";
import { BaseCrud } from "../../shared/utils/baseCrud.js";
import { BaseController } from "../../shared/utils/baseController.js";
import Brand from "../brand/brand.model.js";
import Category from "../category/category.model.js";
import Unit from "../unit/unit.model.js";

// 1. Create CRUD service from model
const ProductCrud = new BaseCrud(Product);

// 2. Extend BaseController to include associations
export class ProductController extends BaseController {
  constructor() {
    super(ProductCrud, "Product");
  }

  // Override getAll to include associations
  getAll = async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const items = await this.service.getAll(page, limit, {
        include: [
          { model: Brand, as: "brand", attributes: ["id", "brandName"] },
          { model: Category, as: "category", attributes: ["id", "categoryName"] },
          { model: Unit, as: "unit", attributes: ["id", "unitName"] },
        ],
      });
      return res.json({ success: true, ...items });
    } catch (error) {
      next(error);
    }
  };

  // Override getById to include associations
  getById = async (req, res, next) => {
    try {
      const item = await this.service.getById(req.params.id, {
        include: [
          { model: Brand, as: "brand", attributes: ["id", "brandName"] },
          { model: Category, as: "category", attributes: ["id", "categoryName"] },
          { model: Unit, as: "unit", attributes: ["id", "unitName"] },
        ],
      });
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `${this.entityName} not found`,
        });
      }
      return res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  };
}

export const productController = new ProductController();

