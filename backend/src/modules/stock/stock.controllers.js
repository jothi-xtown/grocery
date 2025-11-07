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

  /* ──────────────────────────────
     🔹 Get Stock Valuation Report
  ───────────────────────────────── */
  getStockValuationReport = async (req, res, next) => {
    try {
      const { categoryId, brandId, location, groupBy } = req.query;
      
      // Build include options
      const productInclude = [
        { model: Brand, as: "brand", attributes: ["id", "brandName"], required: false },
        { model: Category, as: "category", attributes: ["id", "categoryName"], required: false },
        { model: Unit, as: "unit", attributes: ["id", "unitName"], required: false },
      ];
      
      // Build product where clause
      const productWhere = {};
      if (categoryId) productWhere.categoryId = categoryId;
      if (brandId) productWhere.brandId = brandId;
      
      // Build stock where clause
      const stockWhere = {};
      if (location) stockWhere.location = location;
      
      // Fetch all stock with products
      const stockItems = await Stock.findAll({
        where: stockWhere,
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "productName", "barCode", "purchasePrice", "salesPrice", "hasGST", "gstPercent", "categoryId", "brandId"],
            where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
            include: productInclude,
            required: true,
          },
        ],
        order: [["currentStock", "DESC"]],
      });
      
      // Process data
      let totalStockValue = 0;
      let totalProducts = 0;
      let lowStockItems = 0;
      const valuationData = [];
      const groupedData = {};
      
      stockItems.forEach((stock) => {
        const product = stock.product;
        if (!product) return;
        
        const currentStock = parseFloat(stock.currentStock) || 0;
        const purchasePrice = parseFloat(product.purchasePrice) || 0;
        const stockValue = currentStock * purchasePrice;
        
        totalStockValue += stockValue;
        totalProducts++;
        
        // Check for low stock (assuming threshold of 10)
        if (currentStock < 10) {
          lowStockItems++;
        }
        
        const itemData = {
          id: stock.id,
          productId: product.id,
          productName: product.productName || "Unknown",
          barcode: product.barCode || "-",
          category: product.category?.categoryName || "-",
          categoryId: product.categoryId,
          brand: product.brand?.brandName || "-",
          brandId: product.brandId,
          unit: product.unit?.unitName || "-",
          currentStock: parseFloat(currentStock.toFixed(2)),
          purchasePrice: parseFloat(purchasePrice.toFixed(2)),
          salesPrice: parseFloat((product.salesPrice || 0).toFixed(2)),
          stockValue: parseFloat(stockValue.toFixed(2)),
          location: stock.location || "-",
          isLowStock: currentStock < 10,
        };
        
        valuationData.push(itemData);
        
        // Group data if requested
        if (groupBy === "category" && product.category) {
          const categoryName = product.category.categoryName;
          if (!groupedData[categoryName]) {
            groupedData[categoryName] = {
              category: categoryName,
              totalStock: 0,
              totalValue: 0,
              itemCount: 0,
            };
          }
          groupedData[categoryName].totalStock += currentStock;
          groupedData[categoryName].totalValue += stockValue;
          groupedData[categoryName].itemCount++;
        } else if (groupBy === "brand" && product.brand) {
          const brandName = product.brand.brandName;
          if (!groupedData[brandName]) {
            groupedData[brandName] = {
              brand: brandName,
              totalStock: 0,
              totalValue: 0,
              itemCount: 0,
            };
          }
          groupedData[brandName].totalStock += currentStock;
          groupedData[brandName].totalValue += stockValue;
          groupedData[brandName].itemCount++;
        } else if (groupBy === "location" && stock.location) {
          const locationName = stock.location;
          if (!groupedData[locationName]) {
            groupedData[locationName] = {
              location: locationName,
              totalStock: 0,
              totalValue: 0,
              itemCount: 0,
            };
          }
          groupedData[locationName].totalStock += currentStock;
          groupedData[locationName].totalValue += stockValue;
          groupedData[locationName].itemCount++;
        }
      });
      
      // Convert grouped data to array
      const groupedArray = Object.values(groupedData).map((group) => ({
        ...group,
        totalStock: parseFloat(group.totalStock.toFixed(2)),
        totalValue: parseFloat(group.totalValue.toFixed(2)),
      }));
      
      res.json({
        success: true,
        data: {
          valuationData,
          groupedData: groupBy ? groupedArray : null,
          summary: {
            totalStockValue: parseFloat(totalStockValue.toFixed(2)),
            totalProducts,
            lowStockItems,
            totalStockQuantity: parseFloat(
              valuationData.reduce((sum, item) => sum + item.currentStock, 0).toFixed(2)
            ),
          },
        },
      });
    } catch (error) {
      console.error("Error in getStockValuationReport:", error);
      next(error);
    }
  };
}

export const stockController = new StockController();
