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
      allowNull: false,
    },
    shippingAddressId: {
      type: DataTypes.UUID,
      references: {
        model: "address",
        key: "id",
      },
      allowNull: true,
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
        console.log("🔵 [PO Hook] beforeValidate triggered");
        
        // Only generate orderNumber if it's not already set
        if (!po.orderNumber) {
          try {
            console.log("🔵 [PO Hook] Generating order number for new PO...");
            
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
            
            // Find the last PO with the same financial year prefix
            const POModel = po.constructor;
            const lastPO = await POModel.findOne({
              where: {
                orderNumber: {
                  [Op.like]: `PO/${fyString}/%`
                }
              },
              order: [["createdAt", "DESC"]],
              paranoid: false, // Include soft-deleted records
            });
            
            let lastNumber = 0;
            if (lastPO?.orderNumber) {
              // Extract number from orderNumber (e.g., "PO/25-26/001" -> 1)
              const match = lastPO.orderNumber.match(/PO\/\d{2}-\d{2}\/(\d+)/);
              if (match && match[1]) {
                lastNumber = parseInt(match[1], 10) || 0;
              }
            }
            
            // Generate new order number
            const newNumber = (lastNumber + 1).toString().padStart(3, "0");
            po.orderNumber = `PO/${fyString}/${newNumber}`;
            console.log(`✅ [PO Hook] Generated order number: ${po.orderNumber}`);
          } catch (error) {
            // If hook fails, generate a timestamp-based order number as fallback
            console.error("⚠️ [PO Hook] Error generating order number, using fallback:", error.message);
            const timestamp = Date.now().toString().slice(-6);
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
            po.orderNumber = `PO/${fyStartYear}-${fyEndYear}/${timestamp}`;
            console.log(`✅ [PO Hook] Fallback order number generated: ${po.orderNumber}`);
          }
        } else {
          console.log(`ℹ️ [PO Hook] Order number already set: ${po.orderNumber}`);
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

