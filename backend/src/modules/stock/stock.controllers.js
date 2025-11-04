import Stock from "./stock.model.js";
import { BaseCrud } from "../../shared/utils/baseCrud.js";
import { BaseController } from "../../shared/utils/baseController.js";
import Product from "../product/product.model.js";
import Brand from "../brand/brand.model.js";
import Category from "../category/category.model.js";
import Unit from "../unit/unit.model.js";

// 1️⃣ Create CRUD service from the model
const StockCrud = new BaseCrud(Stock);

// 2️⃣ Extend BaseController to include Product associations
export class StockController extends BaseController {
  constructor() {
    super(StockCrud, "Stock");
  }

  // Override getAll to include Product associations
  getAll = async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const items = await this.service.getAll(page, limit, {
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "productName", "barCode", "purchasePrice", "salesPrice", "gstPercent", "hasGST", "availability"],
            include: [
              { model: Brand, as: "brand", attributes: ["id", "brandName"], required: false },
              { model: Category, as: "category", attributes: ["id", "categoryName"], required: false },
              { model: Unit, as: "unit", attributes: ["id", "unitName"], required: false },
            ],
            required: false,
          },
        ],
      });
      return res.json({ success: true, ...items });
    } catch (error) {
      console.error("Error in StockController.getAll:", error);
      next(error);
    }
  };

  // Override getById to include Product associations
  getById = async (req, res, next) => {
    try {
      const item = await this.service.getById(req.params.id, {
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "productName", "barCode", "purchasePrice", "salesPrice", "gstPercent", "hasGST", "availability"],
            include: [
              { model: Brand, as: "brand", attributes: ["id", "brandName"], required: false },
              { model: Category, as: "category", attributes: ["id", "categoryName"], required: false },
              { model: Unit, as: "unit", attributes: ["id", "unitName"], required: false },
            ],
            required: false,
          },
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
      console.error("Error in StockController.getById:", error);
      next(error);
    }
  };

  // Override create to include Product associations in response
  create = async (req, res, next) => {
    try {
      const userData = {
        ...req.body,
        createdBy: req.user.username,
      };
      
      const item = await this.service.create(userData);
      
      // Reload with associations
      const itemWithAssociations = await this.service.getById(item.id, {
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "productName", "barCode", "purchasePrice", "salesPrice", "gstPercent", "hasGST", "availability"],
            include: [
              { model: Brand, as: "brand", attributes: ["id", "brandName"], required: false },
              { model: Category, as: "category", attributes: ["id", "categoryName"], required: false },
              { model: Unit, as: "unit", attributes: ["id", "unitName"], required: false },
            ],
            required: false,
          },
        ],
      });
      
      return res.status(201).json({
        success: true,
        message: `${this.entityName} created successfully`,
        data: itemWithAssociations,
      });
    } catch (error) {
      console.error("Error in StockController.create:", error);
      next(error);
    }
  };

  // Override update to include Product associations in response
  update = async (req, res, next) => {
    try {
      const userData = {
        ...req.body,
        updatedBy: req.user.username,
      };
      
      const item = await this.service.update(req.params.id, userData);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `${this.entityName} not found`,
        });
      }
      
      // Reload with associations
      const itemWithAssociations = await this.service.getById(req.params.id, {
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "productName", "barCode", "purchasePrice", "salesPrice", "gstPercent", "hasGST", "availability"],
            include: [
              { model: Brand, as: "brand", attributes: ["id", "brandName"], required: false },
              { model: Category, as: "category", attributes: ["id", "categoryName"], required: false },
              { model: Unit, as: "unit", attributes: ["id", "unitName"], required: false },
            ],
            required: false,
          },
        ],
      });
      
      return res.json({
        success: true,
        message: `${this.entityName} updated successfully`,
        data: itemWithAssociations,
      });
    } catch (error) {
      console.error("Error in StockController.update:", error);
      next(error);
    }
  };
}

export const stockController = new StockController();
