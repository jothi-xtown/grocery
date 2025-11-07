import Product from "./product.model.js";
import { BaseCrud } from "../../shared/utils/baseCrud.js";
import { BaseController } from "../../shared/utils/baseController.js";
import Brand from "../brand/brand.model.js";
import Category from "../category/category.model.js";
import Unit from "../unit/unit.model.js";
import Stock from "../stock/stock.model.js";
import BillItem from "../bill/billItem.model.js";
import { POItem } from "../purchaseOrder/purchaseOrder.model.js";

// 1. Create CRUD service from model
const ProductCrud = new BaseCrud(Product);

// 2. Extend BaseController to include associations
export class ProductController extends BaseController {
  constructor() {
    super(ProductCrud, "Product");
  }

  // Override hardDelete to check for dependencies and provide better error messages
  hardDelete = async (req, res, next) => {
    try {
      const productId = req.params.id;
      console.log(`🔵 [Product Controller] Hard delete requested for product ID: ${productId}`);
      
      // First, check if product exists
      const productExists = await this.service.getById(productId, { paranoid: false });
      if (!productExists) {
        console.log(`❌ [Product Controller] Product not found: ${productId}`);
        return res.status(404).json({
          success: false,
          message: `${this.entityName} not found`,
        });
      }
      
      console.log(`✅ [Product Controller] Product found: ${productExists.productName}`);
      
      // Check for dependencies before deletion
      const [stockCount, billItemCount, poItemCount] = await Promise.all([
        Stock.count({ where: { productId }, paranoid: false }),
        BillItem.count({ where: { productId }, paranoid: false }),
        POItem.count({ where: { productId }, paranoid: false })
      ]);
      
      console.log(`📊 [Product Controller] Dependencies found - Stock: ${stockCount}, BillItems: ${billItemCount}, POItems: ${poItemCount}`);
      
      // For hard delete, we'll cascade delete all dependencies
      // Delete stock records first
      if (stockCount > 0) {
        console.log(`🗑️ [Product Controller] Deleting ${stockCount} stock record(s)...`);
        await Stock.destroy({ 
          where: { productId }, 
          force: true, // Hard delete
          paranoid: false 
        });
        console.log(`✅ [Product Controller] Stock records deleted`);
      }
      
      // Delete bill items
      if (billItemCount > 0) {
        console.log(`🗑️ [Product Controller] Deleting ${billItemCount} bill item(s)...`);
        await BillItem.destroy({ 
          where: { productId }, 
          force: true, // Hard delete
          paranoid: false 
        });
        console.log(`✅ [Product Controller] Bill items deleted`);
      }
      
      // Delete PO items
      if (poItemCount > 0) {
        console.log(`🗑️ [Product Controller] Deleting ${poItemCount} purchase order item(s)...`);
        await POItem.destroy({ 
          where: { productId }, 
          force: true, // Hard delete
          paranoid: false 
        });
        console.log(`✅ [Product Controller] PO items deleted`);
      }
      
      console.log(`🗑️ [Product Controller] Attempting hard delete of product...`);
      const item = await this.service.hardDelete(productId);
      
      if (!item) {
        console.log(`❌ [Product Controller] Hard delete returned null`);
        return res.status(404).json({
          success: false,
          message: `${this.entityName} not found or already deleted`,
        });
      }
      
      console.log(`✅ [Product Controller] Product permanently deleted: ${productId}`);
      
      // Build success message with dependency deletion info
      let message = `${this.entityName} permanently deleted`;
      const deletedItems = [];
      if (stockCount > 0) deletedItems.push(`${stockCount} stock record(s)`);
      if (billItemCount > 0) deletedItems.push(`${billItemCount} bill item(s)`);
      if (poItemCount > 0) deletedItems.push(`${poItemCount} purchase order item(s)`);
      
      if (deletedItems.length > 0) {
        message += `. Also deleted: ${deletedItems.join(", ")}.`;
      }
      
      return res.json({
        success: true,
        message: message,
        deletedDependencies: {
          stock: stockCount,
          billItems: billItemCount,
          poItems: poItemCount
        }
      });
    } catch (error) {
      console.error(`❌ [Product Controller] Error in hardDelete:`, error);
      console.error(`❌ [Product Controller] Error name:`, error.name);
      console.error(`❌ [Product Controller] Error message:`, error.message);
      console.error(`❌ [Product Controller] Error stack:`, error.stack);
      
      // Handle foreign key constraint errors
      if (error.name === 'SequelizeForeignKeyConstraintError' || error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({
          success: false,
          message: "Cannot delete product: It is referenced by other records (stock entries, bill items, purchase order items, etc.). Please remove these dependencies first.",
          error: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: "Error deleting product",
        error: error.message
      });
    }
  };

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
        try {
          const items = await this.service.getAll(page, limit);
          return res.json({ success: true, ...items });
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
    } catch (error) {
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
      next(error);
    }
  };

  // Override create to include associations in response
  create = async (req, res, next) => {
    try {
      // Validate foreign key references before creating product
      const { brandId, categoryId, unitId } = req.body;
      const validationErrors = [];
      
      if (brandId) {
        try {
          const brandExists = await Brand.findByPk(brandId);
          if (!brandExists) {
            validationErrors.push(`Brand with ID ${brandId} does not exist`);
          }
        } catch (err) {
          validationErrors.push(`Invalid brandId format: ${brandId}`);
        }
      }
      
      if (categoryId) {
        try {
          const categoryExists = await Category.findByPk(categoryId);
          if (!categoryExists) {
            validationErrors.push(`Category with ID ${categoryId} does not exist`);
          }
        } catch (err) {
          validationErrors.push(`Invalid categoryId format: ${categoryId}`);
        }
      }
      
      if (unitId) {
        try {
          const unitExists = await Unit.findByPk(unitId);
          if (!unitExists) {
            validationErrors.push(`Unit with ID ${unitId} does not exist`);
          }
        } catch (err) {
          validationErrors.push(`Invalid unitId format: ${unitId}`);
        }
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation failed: Invalid foreign key references",
          errors: validationErrors,
        });
      }
      
      // Automatically add user info from JWT token with fallback
      const username = req.user?.username || req.user?.id || "system";
      
      // Extract initialStock from req.body (it's not a database column, only used for stock creation)
      const { initialStock: initialStockRaw, ...productData } = req.body;
      const initialStock = initialStockRaw ? parseFloat(initialStockRaw) : 0;
      
      const userData = {
        ...productData, // Exclude initialStock from product data
        createdBy: username, // Store username from JWT token with fallback
      };
      
      const item = await this.service.create(userData);
      
      // Create stock entry if initialStock is provided
      if (initialStock > 0) {
        try {
          // Check if stock entry already exists
          const existingStock = await Stock.findOne({
            where: { productId: item.id },
          });

          if (!existingStock) {
            // Create new stock entry with initial stock
            await Stock.create({
              productId: item.id,
              openingStock: initialStock,
              purchasedQty: 0,
              soldQty: 0,
              currentStock: initialStock,
              lastUpdated: new Date(),
              createdBy: username,
            });
          } else {
            // Update existing stock entry
            await existingStock.update({
              openingStock: initialStock,
              currentStock: initialStock,
              lastUpdated: new Date(),
              updatedBy: username,
            });
          }
        } catch (stockError) {
          // Log error but don't fail product creation
        }
      }
      
      // Reload with associations - wrap in try-catch to handle failures gracefully
      let itemWithAssociations = item;
      try {
        itemWithAssociations = await this.service.getById(item.id, {
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
      } catch (associationError) {
        // Return product without associations if loading fails
      }
      
      return res.status(201).json({
        success: true,
        message: `${this.entityName} created successfully`,
        data: itemWithAssociations,
      });
    } catch (error) {
      // Handle specific Sequelize errors
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors.map(e => ({
            field: e.path,
            message: e.message,
          })),
        });
      }
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: "Duplicate entry",
          errors: error.errors.map(e => ({
            field: e.path,
            message: e.message,
          })),
        });
      }
      
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          success: false,
          message: "Invalid foreign key reference",
          error: error.message,
        });
      }
      
      next(error);
    }
  };

  // Override update to include associations in response
  update = async (req, res, next) => {
    try {
      // Automatically add user info from JWT token with fallback
      const username = req.user?.username || req.user?.id || "system";
      
      // Extract initialStock from req.body (it's not a database column, only used for stock updates if needed)
      const { initialStock: initialStockRaw, ...productData } = req.body;
      
      const userData = {
        ...productData, // Exclude initialStock from product data
        updatedBy: username, // Store username from JWT token with fallback
      };
      
      const item = await this.service.update(req.params.id, userData);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `${this.entityName} not found`,
        });
      }
      
      // Reload with associations
      let itemWithAssociations = item;
      try {
        itemWithAssociations = await this.service.getById(req.params.id, {
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
      } catch (associationError) {
        // Return product without associations if association loading fails
      }
      
      return res.json({
        success: true,
        message: `${this.entityName} updated successfully`,
        data: itemWithAssociations,
      });
    } catch (error) {
      // Handle specific Sequelize errors
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors.map(e => ({
            field: e.path,
            message: e.message,
          })),
        });
      }
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: "Duplicate entry",
          errors: error.errors.map(e => ({
            field: e.path,
            message: e.message,
          })),
        });
      }
      
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          success: false,
          message: "Invalid foreign key reference",
          error: error.message,
        });
      }
      
      next(error);
    }
  };
}

export const productController = new ProductController();

