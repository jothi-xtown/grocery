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
      console.log("🔵 [PO Controller] Create request received");
      console.log("🔵 [PO Controller] Request body:", JSON.stringify(req.body, null, 2));
      
      // Validate required fields
      if (!req.body.orderDate) {
        return res.status(400).json({
          success: false,
          message: "Order date is required"
        });
      }

      if (!req.body.supplierId) {
        return res.status(400).json({
          success: false,
          message: "Supplier is required"
        });
      }

      const poItems = req.body.items || [];
      if (poItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one item is required"
        });
      }

      // Validate items
      for (let i = 0; i < poItems.length; i++) {
        const item = poItems[i];
        if (!item.productId) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Product is required`
          });
        }
        if (!item.unitQuantity || item.unitQuantity <= 0) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Valid quantity is required`
          });
        }
      }
      
      // Automatically add user info from JWT token with fallback
      const username = req.user?.username || req.user?.id || "system";
      console.log("🔵 [PO Controller] Username:", username);
      
      // Build userData object with only allowed fields
      // Explicitly exclude addressId and shippingAddressId since database doesn't allow null
      const { addressId, shippingAddressId, items, ...restBody } = req.body;
      
      const userData = {
        // Don't include orderNumber - let the hook generate it
        orderDate: restBody.orderDate,
        supplierId: restBody.supplierId,
        gstInclude: restBody.gstInclude || false,
        gstPercent: restBody.gstPercent || 0,
        status: restBody.status || 'pending',
        notes: restBody.notes || null,
        createdBy: username,
      };

      // Only include orderNumber if it's explicitly provided and not empty
      if (restBody.orderNumber && restBody.orderNumber.trim()) {
        userData.orderNumber = restBody.orderNumber.trim();
        console.log("🔵 [PO Controller] OrderNumber provided:", userData.orderNumber);
      } else {
        console.log("🔵 [PO Controller] OrderNumber will be auto-generated");
      }

      // Explicitly ensure addressId and shippingAddressId are not in userData
      // Do not include them at all - not even as undefined
      delete userData.addressId;
      delete userData.shippingAddressId;

      console.log("🔵 [PO Controller] UserData prepared:", JSON.stringify(userData, null, 2));
      console.log("🔵 [PO Controller] PO Items count:", poItems.length);

      // Create PO with items in a transaction
      const transaction = await PurchaseOrder.sequelize.transaction();
      
      try {
        // Set orderNumber to empty string if not provided - the beforeValidate hook will generate it
        // This ensures the field is included in the INSERT and the hook can set it
        const hasOrderNumber = userData.orderNumber && userData.orderNumber.trim();
        
        if (!hasOrderNumber) {
          userData.orderNumber = ""; // Set to empty string so hook can detect and generate it
        }
        
        // Use fields option to explicitly specify which fields to insert
        // This prevents Sequelize from trying to insert addressId and shippingAddressId
        // Always include orderNumber - the beforeValidate hook will set it if empty
        const fieldsToInsert = ['orderNumber', 'orderDate', 'supplierId', 'gstInclude', 'gstPercent', 'status', 'notes', 'createdBy'];
        
        console.log("🔵 [PO Controller] Fields to insert:", fieldsToInsert);
        console.log("🔵 [PO Controller] Creating PO...");
        console.log("🔵 [PO Controller] UserData orderNumber before create:", userData.orderNumber || "(will be generated by hook)");
        
        const po = await PurchaseOrder.create(userData, { 
          transaction,
          fields: fieldsToInsert
        });

        console.log("✅ [PO Controller] PO created with ID:", po.id);
        console.log("✅ [PO Controller] PO orderNumber:", po.orderNumber);

        // Create PO items if provided
        if (poItems.length > 0) {
          console.log("🔵 [PO Controller] Creating PO items...");
          const poItemsData = poItems.map((item) => ({
            productId: item.productId,
            unitPrice: item.unitPrice || item.rate || 0, // Map 'rate' to 'unitPrice'
            unitQuantity: item.unitQuantity,
            totalQuantity: item.totalQuantity || null,
            total: item.total,
            purchaseOrderId: po.id,
            createdBy: username,
          }));
          console.log("🔵 [PO Controller] PO Items data:", JSON.stringify(poItemsData, null, 2));
          await POItem.bulkCreate(poItemsData, { transaction });
          console.log("✅ [PO Controller] PO items created successfully");
        }

        console.log("🔵 [PO Controller] Committing transaction...");
        await transaction.commit();
        console.log("✅ [PO Controller] Transaction committed");

        // Reload with associations - wrap in try-catch to handle failures gracefully
        console.log("🔵 [PO Controller] Reloading PO with associations...");
        let poWithAssociations = po;
        try {
          poWithAssociations = await PurchaseOrder.findByPk(po.id, {
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
          console.log("✅ [PO Controller] PO reloaded with associations");
        } catch (reloadError) {
          console.error("⚠️ [PO Controller] Error reloading with associations:", reloadError);
          console.error("⚠️ [PO Controller] Returning PO without associations");
          // Continue with the basic PO object if reload fails
        }

        console.log("✅ [PO Controller] Returning success response");

        return res.status(201).json({
          success: true,
          message: `${this.entityName} created successfully`,
          data: poWithAssociations,
        });
      } catch (error) {
        console.error("❌ [PO Controller] Error in transaction:", error);
        console.error("❌ [PO Controller] Error name:", error.name);
        console.error("❌ [PO Controller] Error message:", error.message);
        console.error("❌ [PO Controller] Error stack:", error.stack);
        await transaction.rollback();
        console.log("🔄 [PO Controller] Transaction rolled back");
        throw error;
      }
    } catch (error) {
      console.error("❌ [PO Controller] Error caught in outer catch block");
      console.error("❌ [PO Controller] Error name:", error.name);
      console.error("❌ [PO Controller] Error message:", error.message);
      console.error("❌ [PO Controller] Error stack:", error.stack);
      console.error("❌ [PO Controller] Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Handle specific Sequelize errors
      if (error.name === 'SequelizeValidationError') {
        console.error("❌ [PO Controller] Validation error details:", error.errors);
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors?.map(e => ({
            field: e.path,
            message: e.message,
          })) || [{ field: "unknown", message: error.message }],
        });
      }
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        // Check if it's a duplicate orderNumber error and retry
        const isOrderNumberError = error.errors?.some(e => e.path === 'orderNumber');
        
        if (isOrderNumberError) {
          // Retry once with auto-generated order number
          try {
            const retryTransaction = await PurchaseOrder.sequelize.transaction();
            
            try {
              // Remove orderNumber from userData to trigger auto-generation
              const retryUserData = { ...userData };
              delete retryUserData.orderNumber;
              
              const fieldsToInsert = ['orderDate', 'supplierId', 'gstInclude', 'gstPercent', 'status', 'notes', 'createdBy'];
              
              const po = await PurchaseOrder.create(retryUserData, { 
                transaction: retryTransaction,
                fields: fieldsToInsert
              });

              // Create PO items if provided
              if (poItems.length > 0) {
                const poItemsData = poItems.map((item) => ({
                  productId: item.productId,
                  unitPrice: item.unitPrice || item.rate || 0,
                  unitQuantity: item.unitQuantity,
                  totalQuantity: item.totalQuantity || null,
                  total: item.total,
                  purchaseOrderId: po.id,
                  createdBy: username,
                }));
                await POItem.bulkCreate(poItemsData, { transaction: retryTransaction });
              }

              await retryTransaction.commit();

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
            } catch (retryError) {
              await retryTransaction.rollback();
              throw retryError;
            }
          } catch (retryError) {
            // If retry also fails, return the original error
            return res.status(400).json({
              success: false,
              message: "Duplicate entry",
              errors: error.errors?.map(e => ({
                field: e.path,
                message: e.message,
              })) || [{ field: "orderNumber", message: "Order number already exists" }],
            });
          }
        }
        
        return res.status(400).json({
          success: false,
          message: "Duplicate entry",
          errors: error.errors?.map(e => ({
            field: e.path,
            message: e.message,
          })) || [{ field: "unknown", message: error.message }],
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

  // Override update to handle items
  update = async (req, res, next) => {
    try {
      console.log("🔵 [PO Controller] Update request received:", {
        id: req.params.id,
        body: req.body,
        status: req.body.status
      });

      // Automatically add user info from JWT token with fallback
      const username = req.user?.username || req.user?.id || "system";

      const userData = {
        ...req.body,
        updatedBy: username,
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

        console.log("🔵 [PO Controller] Previous status:", previousStatus);
        console.log("🔵 [PO Controller] New status:", userData.status);
        console.log("🔵 [PO Controller] Is changing to received:", isStatusChangingToReceived);
        console.log("🔵 [PO Controller] UserData to update:", JSON.stringify(userData, null, 2));

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
              createdBy: username,
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
                  createdBy: username,
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
                  updatedBy: username,
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
        console.log("🔵 [PO Controller] Reloading PO with associations after update...");
        const poWithAssociations = await PurchaseOrder.findByPk(req.params.id, {
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
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        code: error.code,
        ...error
      });
      
      // Provide more detailed error messages
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors?.map(e => e.message) || [error.message]
        });
      }
      
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          success: false,
          message: "Invalid reference: One or more related records do not exist",
          error: error.message
        });
      }
      
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

