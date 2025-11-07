import { DataTypes, Op } from "sequelize";
import sequelize from "../../config/db.js";
import { commonFields } from "../../shared/models/commonFields.js";
import Supplier from "../supplier/supplier.model.js";
import Address from "../address/address.model.js";
import Product from "../product/product.model.js";

// Purchase Order Model
const PurchaseOrder = sequelize.define(
  "PurchaseOrder",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      defaultValue: null, // Will be set by beforeValidate hook
    },
    orderDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    supplierId: {
      type: DataTypes.UUID,
      references: {
        model: "supplier",
        key: "id",
      },
      allowNull: false,
    },
    addressId: {
      type: DataTypes.UUID,
      references: {
        model: "address",
        key: "id",
      },
      allowNull: true,
      defaultValue: null,
    },
    shippingAddressId: {
      type: DataTypes.UUID,
      references: {
        model: "address",
        key: "id",
      },
      allowNull: true,
      defaultValue: null,
    },
    gstInclude: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    gstPercent: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("pending", "received"),
      defaultValue: "pending",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ...commonFields,
  },
  {
    tableName: "purchase_order",
    timestamps: true,
    paranoid: true,
    hooks: {
      // Auto-generate order number before creating a PO
      beforeValidate: async (po, options) => {
        // Only generate orderNumber if it's not already set or is empty/whitespace
        if (!po.orderNumber || !po.orderNumber.trim()) {
          try {
            console.log("🔵 [PO Hook] Generating orderNumber...");
            
            // Get current financial year (April to March)
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1; // 1-12
            
            // Financial year starts in April (month 4)
            let fyStartYear, fyEndYear;
            if (currentMonth >= 4) {
              // April to December: current year to next year
              fyStartYear = currentYear.toString().slice(-2);
              fyEndYear = (currentYear + 1).toString().slice(-2);
            } else {
              // January to March: previous year to current year
              fyStartYear = (currentYear - 1).toString().slice(-2);
              fyEndYear = currentYear.toString().slice(-2);
            }
            
            const fyString = `${fyStartYear}-${fyEndYear}`;
            console.log("🔵 [PO Hook] Financial year string:", fyString);
            
            // Find the last PO with the same financial year prefix
            // Use transaction if available to ensure consistency
            const POModel = po.constructor;
            const queryOptions = {
              where: {
                orderNumber: {
                  [Op.like]: `PO/${fyString}/%`
                }
              },
              order: [["createdAt", "DESC"]],
              paranoid: false, // Include soft-deleted records
            };
            
            // Include transaction if available
            if (options?.transaction) {
              queryOptions.transaction = options.transaction;
            }
            
            console.log("🔵 [PO Hook] Querying for last PO...");
            const lastPO = await POModel.findOne(queryOptions);
            console.log("🔵 [PO Hook] Last PO found:", lastPO?.orderNumber || "none");
            
            let lastNumber = 0;
            if (lastPO?.orderNumber) {
              // Extract number from orderNumber (e.g., "PO/25-26/001" -> 1)
              const match = lastPO.orderNumber.match(/PO\/\d{2}-\d{2}\/(\d+)/);
              if (match && match[1]) {
                lastNumber = parseInt(match[1], 10) || 0;
              }
            }
            
            console.log("🔵 [PO Hook] Last number:", lastNumber);
            
            // Generate new order number with retry logic for uniqueness
            let attempts = 0;
            let newNumber;
            let generatedOrderNumber;
            
            do {
              newNumber = (lastNumber + 1 + attempts).toString().padStart(3, "0");
              generatedOrderNumber = `PO/${fyString}/${newNumber}`;
              
              // Check if this order number already exists
              const existingPO = await POModel.findOne({
                where: { orderNumber: generatedOrderNumber },
                paranoid: false,
                transaction: options?.transaction,
              });
              
              if (!existingPO) {
                break; // Number is unique
              }
              
              attempts++;
              if (attempts > 100) {
                // Fallback to timestamp if too many attempts
                console.warn("⚠️ [PO Hook] Too many duplicate attempts, using fallback");
                throw new Error("Too many duplicate attempts");
              }
            } while (attempts <= 100);
            
            po.orderNumber = generatedOrderNumber;
            console.log("✅ [PO Hook] Generated orderNumber:", po.orderNumber);
          } catch (error) {
            console.error("❌ [PO Hook] Error generating orderNumber:", error);
            console.error("❌ [PO Hook] Error message:", error.message);
            console.error("❌ [PO Hook] Error stack:", error.stack);
            
            // If hook fails, generate a timestamp-based order number as fallback
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 100).toString().padStart(2, "0");
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
            po.orderNumber = `PO/${fyStartYear}-${fyEndYear}/${timestamp}${random}`;
            console.log("✅ [PO Hook] Using fallback orderNumber:", po.orderNumber);
          }
        } else {
          console.log("🔵 [PO Hook] OrderNumber already set:", po.orderNumber);
        }
      },
    },
  }
);

// Purchase Order Item Model
const POItem = sequelize.define(
  "POItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    purchaseOrderId: {
      type: DataTypes.UUID,
      references: {
        model: "purchase_order",
        key: "id",
      },
      allowNull: false,
    },
    productId: {
      type: DataTypes.UUID,
      references: {
        model: "product",
        key: "id",
      },
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    unitQuantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    totalQuantity: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    ...commonFields,
  },
  {
    tableName: "po_item",
    timestamps: true,
    paranoid: true,
  }
);

// Associations
PurchaseOrder.belongsTo(Supplier, { foreignKey: "supplierId", as: "supplier" });
PurchaseOrder.belongsTo(Address, { foreignKey: "addressId", as: "billingAddress" });
PurchaseOrder.belongsTo(Address, { foreignKey: "shippingAddressId", as: "shippingAddress" });
PurchaseOrder.hasMany(POItem, { foreignKey: "purchaseOrderId", as: "items" });

POItem.belongsTo(PurchaseOrder, { foreignKey: "purchaseOrderId", as: "purchaseOrder" });
POItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

export { PurchaseOrder, POItem };
export default PurchaseOrder;

