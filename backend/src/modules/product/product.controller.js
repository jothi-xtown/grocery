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
      
      // Try to get items with associations
      try {
        const items = await this.service.getAll(page, limit, {
          include: [
            { 
              model: Brand, 
              as: "brand", 
              attributes: ["id", "brandName"],
              required: false 
            },
            { 
              model: Category, 
              as: "category", 
              attributes: ["id", "categoryName"],
              required: false 
            },
            { 
              model: Unit, 
              as: "unit", 
              attributes: ["id", "unitName"],
              required: false 
            },
          ],
        });
        return res.json({ success: true, ...items });
      } catch (includeError) {
        // If associations fail, try without them
        console.error("Error with associations, trying without:", includeError);
        const items = await this.service.getAll(page, limit);
        return res.json({ success: true, ...items });
      }
    } catch (error) {
      console.error("Error in ProductController.getAll:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        ...error
      });
      next(error);
    }
  };

  // Override getById to include associations
  getById = async (req, res, next) => {
    try {
      const item = await this.service.getById(req.params.id, {
        include: [
          { 
            model: Brand, 
            as: "brand", 
            attributes: ["id", "brandName"],
            required: false 
          },
          { 
            model: Category, 
            as: "category", 
            attributes: ["id", "categoryName"],
            required: false 
          },
          { 
            model: Unit, 
            as: "unit", 
            attributes: ["id", "unitName"],
            required: false 
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
      console.error("Error in ProductController.getById:", error);
      next(error);
    }
  };

  // Override create to include associations in response
  create = async (req, res, next) => {
    try {
      // Automatically add user info from JWT token
      const userData = {
        ...req.body,
        createdBy: req.user.username, // Store username from JWT token
      };
      
      const item = await this.service.create(userData);
      
      // Reload with associations
      const itemWithAssociations = await this.service.getById(item.id, {
        include: [
          { 
            model: Brand, 
            as: "brand", 
            attributes: ["id", "brandName"],
            required: false 
          },
          { 
            model: Category, 
            as: "category", 
            attributes: ["id", "categoryName"],
            required: false 
          },
          { 
            model: Unit, 
            as: "unit", 
            attributes: ["id", "unitName"],
            required: false 
          },
        ],
      });
      
      return res.status(201).json({
        success: true,
        message: `${this.entityName} created successfully`,
        data: itemWithAssociations,
      });
    } catch (error) {
      console.error("Error in ProductController.create:", error);
      console.error("Error stack:", error.stack);
      console.error("Request body:", req.body);
      next(error);
    }
  };

  // Override update to include associations in response
  update = async (req, res, next) => {
    try {
      // Automatically add user info from JWT token
      const userData = {
        ...req.body,
        updatedBy: req.user.username, // Store username from JWT token
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
            model: Brand, 
            as: "brand", 
            attributes: ["id", "brandName"],
            required: false 
          },
          { 
            model: Category, 
            as: "category", 
            attributes: ["id", "categoryName"],
            required: false 
          },
          { 
            model: Unit, 
            as: "unit", 
            attributes: ["id", "unitName"],
            required: false 
          },
        ],
      });
      
      return res.json({
        success: true,
        message: `${this.entityName} updated successfully`,
        data: itemWithAssociations,
      });
    } catch (error) {
      console.error("Error in ProductController.update:", error);
      console.error("Error stack:", error.stack);
      console.error("Request body:", req.body);
      console.error("Product ID:", req.params.id);
      next(error);
    }
  };
}

export const productController = new ProductController();

