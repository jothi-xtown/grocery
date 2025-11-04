import PurchaseOrder, { POItem } from "./purchaseOrder.model.js";
import { BaseCrud } from "../../shared/utils/baseCrud.js";
import { BaseController } from "../../shared/utils/baseController.js";
import Supplier from "../supplier/supplier.model.js";
import Address from "../address/address.model.js";
import Product from "../product/product.model.js";
import Unit from "../unit/unit.model.js";
import Stock from "../stock/stock.model.js";

// 1. Create CRUD service from model
const PurchaseOrderCrud = new BaseCrud(PurchaseOrder);

// 2. Extend BaseController to include associations
export class PurchaseOrderController extends BaseController {
  constructor() {
    super(PurchaseOrderCrud, "PurchaseOrder");
  }

  // Override getAll to include associations
  getAll = async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const items = await this.service.getAll(page, limit, {
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "supplierName", "phone", "email"],
            required: false,
          },
          {
            model: Address,
            as: "billingAddress",
            attributes: ["id", "addressBill", "phone", "email"],
            required: false,
          },
          {
            model: Address,
            as: "shippingAddress",
            attributes: ["id", "addressShip", "phone", "email"],
            required: false,
          },
          {
            model: POItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "productName", "barCode", "purchasePrice"],
                required: false,
              },
            ],
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      return res.json({ success: true, ...items });
    } catch (error) {
      console.error("Error in PurchaseOrderController.getAll:", error);
      next(error);
    }
  };

  // Override getById to include associations
  getById = async (req, res, next) => {
    try {
      const item = await this.service.getById(req.params.id, {
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "supplierName", "phone", "email"],
            required: false,
          },
          {
            model: Address,
            as: "billingAddress",
            attributes: ["id", "addressBill", "phone", "email"],
            required: false,
          },
          {
            model: Address,
            as: "shippingAddress",
            attributes: ["id", "addressShip", "phone", "email"],
            required: false,
          },
          {
            model: POItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "productName", "barCode", "purchasePrice"],
                required: false,
              },
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
      console.error("Error in PurchaseOrderController.getById:", error);
      next(error);
    }
  };

  // Override create to handle items
  create = async (req, res, next) => {
    try {
      const userData = {
        ...req.body,
        createdBy: req.user.username,
      };

      const items = userData.items || [];
      delete userData.items;

      // Create PO with items in a transaction
      const transaction = await PurchaseOrder.sequelize.transaction();
      
      try {
        const po = await PurchaseOrder.create(userData, { transaction });

        // Create PO items if provided
        if (items.length > 0) {
          const poItemsData = items.map((item) => ({
            productId: item.productId,
            unitPrice: item.unitPrice || item.rate || 0, // Map 'rate' to 'unitPrice'
            unitQuantity: item.unitQuantity,
            totalQuantity: item.totalQuantity || null,
            total: item.total,
            purchaseOrderId: po.id,
            createdBy: req.user.username,
          }));
          await POItem.bulkCreate(poItemsData, { transaction });
        }

        await transaction.commit();

        // Reload with associations
        const poWithAssociations = await this.service.getById(po.id, {
          include: [
            {
              model: Supplier,
              as: "supplier",
              attributes: ["id", "supplierName", "phone", "email"],
              required: false,
            },
            {
              model: Address,
              as: "billingAddress",
              attributes: ["id", "addressBill", "phone", "email"],
              required: false,
            },
            {
              model: Address,
              as: "shippingAddress",
              attributes: ["id", "addressShip", "phone", "email"],
              required: false,
            },
            {
              model: POItem,
              as: "items",
              include: [
                {
                  model: Product,
                  as: "product",
                  attributes: ["id", "productName", "barCode", "purchasePrice"],
                  include: [
                    {
                      model: Unit,
                      as: "unit",
                      attributes: ["id", "unitName"],
                      required: false,
                    },
                  ],
                  required: false,
                },
              ],
              required: false,
            },
          ],
        });

        return res.status(201).json({
          success: true,
          message: `${this.entityName} created successfully`,
          data: poWithAssociations,
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Error in PurchaseOrderController.create:", error);
      console.error("Error stack:", error.stack);
      console.error("Request body:", req.body);
      next(error);
    }
  };

  // Override update to handle items
  update = async (req, res, next) => {
    try {
      console.log("🔵 [PO Controller] Update request received:", {
        id: req.params.id,
        body: req.body,
        status: req.body.status
      });

      const userData = {
        ...req.body,
        updatedBy: req.user.username,
      };

      const items = userData.items;
      delete userData.items;

      // Check if this is a status-only update
      const isStatusOnlyUpdate = Object.keys(userData).filter(key => 
        key !== 'updatedBy' && key !== 'status'
      ).length === 0 && userData.status;

      console.log("🔵 [PO Controller] Is status-only update:", isStatusOnlyUpdate);

      const transaction = await PurchaseOrder.sequelize.transaction();

      try {
        const po = await PurchaseOrder.findByPk(req.params.id, { 
          include: [
            {
              model: POItem,
              as: "items",
              required: false,
            },
          ],
          transaction 
        });
        if (!po) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: `${this.entityName} not found`,
          });
        }

        // Store previous status to check if status is changing to "received"
        const previousStatus = po.status;
        const isStatusChangingToReceived = 
          userData.status === "received" && previousStatus !== "received";

        await po.update(userData, { transaction });

        // Update items only if explicitly provided and not empty
        // If status-only update and items not provided, preserve existing items
        if (items !== undefined) {
          console.log("🔵 [PO Controller] Items provided, updating items:", items.length);
          // Delete existing items
          await POItem.destroy({
            where: { purchaseOrderId: req.params.id },
            transaction,
          });

          // Create new items only if items array is not empty
          if (items && items.length > 0) {
            const poItemsData = items.map((item) => ({
              productId: item.productId,
              unitPrice: item.unitPrice || item.rate || 0, // Map 'rate' to 'unitPrice'
              unitQuantity: item.unitQuantity,
              totalQuantity: item.totalQuantity || null,
              total: item.total,
              purchaseOrderId: req.params.id,
              createdBy: req.user.username,
            }));
            await POItem.bulkCreate(poItemsData, { transaction });
            console.log("✅ [PO Controller] Items updated successfully");
          } else {
            console.log("⚠️ [PO Controller] Items array is empty, items deleted");
          }
        } else {
          console.log("ℹ️ [PO Controller] Items not provided, preserving existing items");
        }

        // ✅ Update stock when PO status changes to "received"
        if (isStatusChangingToReceived) {
          console.log("📦 [PO Controller] Status changed to 'received', updating stock...");
          
          // Get PO items after they've been updated/created
          // Need to fetch fresh items from database since they may have been recreated
          const poWithItems = await PurchaseOrder.findByPk(req.params.id, {
            include: [
              {
                model: POItem,
                as: "items",
                required: false,
              },
            ],
            transaction,
          });
          
          const poItems = (poWithItems?.items || []).map(item => ({
            productId: item.productId,
            unitQuantity: item.unitQuantity,
            totalQuantity: item.totalQuantity,
          }));
          
          if (poItems.length === 0) {
            console.log("⚠️ [PO Controller] No items found in PO, skipping stock update");
          }

          // Update stock for each product in PO items
          for (const item of poItems) {
            const { productId, unitQuantity = 0, totalQuantity = null } = item;
            
            // Use totalQuantity if available, otherwise use unitQuantity
            const quantityToAdd = totalQuantity !== null && totalQuantity !== undefined 
              ? parseFloat(totalQuantity) 
              : parseFloat(unitQuantity) || 0;

            if (quantityToAdd <= 0) {
              console.log(`⚠️ [PO Controller] Skipping stock update for product ${productId} - quantity is 0 or invalid`);
              continue;
            }

            try {
              // Find or create stock record for this product
              let stock = await Stock.findOne({
                where: { productId },
                transaction,
              });

              if (!stock) {
                // Create new stock record with default values
                console.log(`📦 [PO Controller] Creating new stock record for product ${productId}`);
                stock = await Stock.create({
                  productId,
                  openingStock: 0,
                  purchasedQty: quantityToAdd,
                  soldQty: 0,
                  currentStock: quantityToAdd,
                  lastUpdated: new Date(),
                  createdBy: req.user.username,
                }, { transaction });
                console.log(`✅ [PO Controller] Stock record created for product ${productId} with quantity ${quantityToAdd}`);
              } else {
                // Update existing stock record
                console.log(`📦 [PO Controller] Updating existing stock record for product ${productId}`);
                const oldPurchasedQty = parseFloat(stock.purchasedQty) || 0;
                const newPurchasedQty = oldPurchasedQty + quantityToAdd;
                const openingStock = parseFloat(stock.openingStock) || 0;
                const soldQty = parseFloat(stock.soldQty) || 0;
                const newCurrentStock = openingStock + newPurchasedQty - soldQty;

                await stock.update({
                  purchasedQty: newPurchasedQty,
                  currentStock: newCurrentStock,
                  lastUpdated: new Date(),
                  updatedBy: req.user.username,
                }, { transaction });
                console.log(`✅ [PO Controller] Stock updated for product ${productId}: purchasedQty=${newPurchasedQty}, currentStock=${newCurrentStock}`);
              }
            } catch (stockError) {
              console.error(`❌ [PO Controller] Error updating stock for product ${productId}:`, stockError);
              // Continue with other items even if one fails
            }
          }
          
          console.log("✅ [PO Controller] Stock update completed");
        }

        await transaction.commit();

        // Reload with associations
        const poWithAssociations = await this.service.getById(req.params.id, {
          include: [
            {
              model: Supplier,
              as: "supplier",
              attributes: ["id", "supplierName", "phone", "email"],
              required: false,
            },
            {
              model: Address,
              as: "billingAddress",
              attributes: ["id", "addressBill", "phone", "email"],
              required: false,
            },
            {
              model: Address,
              as: "shippingAddress",
              attributes: ["id", "addressShip", "phone", "email"],
              required: false,
            },
            {
              model: POItem,
              as: "items",
              include: [
                {
                  model: Product,
                  as: "product",
                  attributes: ["id", "productName", "barCode", "purchasePrice"],
                  include: [
                    {
                      model: Unit,
                      as: "unit",
                      attributes: ["id", "unitName"],
                      required: false,
                    },
                  ],
                  required: false,
                },
              ],
              required: false,
            },
          ],
        });

        return res.json({
          success: true,
          message: `${this.entityName} updated successfully`,
          data: poWithAssociations,
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Error in PurchaseOrderController.update:", error);
      console.error("Error stack:", error.stack);
      console.error("Request body:", req.body);
      next(error);
    }
  };

  // Generate PO reference number
  generateRef = async (req, res, next) => {
    try {
      // Create a temporary PO instance to trigger the hook
      const tempPO = PurchaseOrder.build({ orderDate: new Date() });
      await tempPO.validate();
      
      return res.json({
        success: true,
        refNo: tempPO.orderNumber,
      });
    } catch (error) {
      console.error("Error generating PO reference:", error);
      // Fallback
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      let fyStartYear, fyEndYear;
      if (currentMonth >= 4) {
        fyStartYear = currentYear.toString().slice(-2);
        fyEndYear = (currentYear + 1).toString().slice(-2);
      } else {
        fyStartYear = (currentYear - 1).toString().slice(-2);
        fyEndYear = currentYear.toString().slice(-2);
      }
      return res.json({
        success: true,
        refNo: `PO/${fyStartYear}-${fyEndYear}/001`,
      });
    }
  };
}

export const purchaseOrderController = new PurchaseOrderController();

