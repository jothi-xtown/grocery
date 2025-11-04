import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { commonFields } from "../../shared/models/commonFields.js";
import Brand from "../brand/brand.model.js";
import Category from "../category/category.model.js";
import Unit from "../unit/unit.model.js";

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    barCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    productName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    hsn_sac_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    hasGST: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    gstPercent: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    discountPercent: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    piecePrice: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    pieceSalesPrice: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    purchasePrice: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    salesPrice: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    availability: {
      type: DataTypes.ENUM("Yes", "No"),
      defaultValue: "Yes",
    },

    lowQtyIndication: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    unitQuantity: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    brandId: {
      type: DataTypes.UUID,
      references: {
        model: "brand",
        key: "id",
      },
      allowNull: true,
    },

    categoryId: {
      type: DataTypes.UUID,
      references: {
        model: "category",
        key: "id",
      },
      allowNull: true,
    },

    unitId: {
      type: DataTypes.UUID,
      references: {
        model: "unit",
        key: "id",
      },
      allowNull: true,
    },

    ...commonFields,
  },
  {
    tableName: "product",
    timestamps: true,
    paranoid: true,
    hooks: {
      // Primary hook: runs before validation (ensures barcode exists before allowNull check)
      beforeValidate: async (product, options) => {
        console.log("🔵 [Product Hook] beforeValidate triggered");
        
        // Only generate barcode if it's not already set
        if (!product.barCode) {
          try {
            console.log("🔵 [Product Hook] Generating barcode for new product...");
            
            // Get the model from the instance's constructor
            const ProductModel = product.constructor;
            
            // Find the last product (including soft-deleted ones for accurate numbering)
            // Add timeout to prevent hanging
            const queryPromise = ProductModel.findOne({
              order: [["createdAt", "DESC"]],
              paranoid: false, // Include soft-deleted records
            });
            
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Barcode query timeout")), 5000)
            );
            
            const lastProduct = await Promise.race([queryPromise, timeoutPromise]);
            
            let lastNumber = 0;
            if (lastProduct?.barCode) {
              // Extract number from barcode (e.g., "PRD0001" -> 1)
              const match = lastProduct.barCode.match(/PRD(\d+)/);
              if (match && match[1]) {
                lastNumber = parseInt(match[1], 10) || 0;
              }
            }
            
            // Generate new barcode
            const newNumber = (lastNumber + 1).toString().padStart(4, "0");
            product.barCode = `PRD${newNumber}`;
            console.log(`✅ [Product Hook] Generated barcode: ${product.barCode}`);
          } catch (error) {
            // If hook fails, generate a timestamp-based barcode as fallback
            console.error("⚠️ [Product Hook] Error generating barcode, using fallback:", error.message);
            const timestamp = Date.now().toString().slice(-6);
            product.barCode = `PRD${timestamp}`;
            console.log(`✅ [Product Hook] Fallback barcode generated: ${product.barCode}`);
          }
        } else {
          console.log(`ℹ️ [Product Hook] Barcode already set: ${product.barCode}`);
        }
      },

      // Backup hook: runs before create (in case beforeValidate didn't run)
      beforeCreate: async (product, options) => {
        console.log("🔵 [Product Hook] beforeCreate triggered");
        // Only generate if barcode is still not set (double-check)
        if (!product.barCode) {
          try {
            console.log("🔵 [Product Hook] Generating barcode in beforeCreate...");
            
            // Get the model from the instance's constructor
            const ProductModel = product.constructor;
            
            // Find the last product (including soft-deleted ones for accurate numbering)
            const queryPromise = ProductModel.findOne({
              order: [["createdAt", "DESC"]],
              paranoid: false,
            });
            
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Barcode query timeout")), 5000)
            );
            
            const lastProduct = await Promise.race([queryPromise, timeoutPromise]);
            
            let lastNumber = 0;
            if (lastProduct?.barCode) {
              const match = lastProduct.barCode.match(/PRD(\d+)/);
              if (match && match[1]) {
                lastNumber = parseInt(match[1], 10) || 0;
              }
            }
            
            const newNumber = (lastNumber + 1).toString().padStart(4, "0");
            product.barCode = `PRD${newNumber}`;
            console.log(`✅ [Product Hook] Generated barcode in beforeCreate: ${product.barCode}`);
          } catch (error) {
            console.error("⚠️ [Product Hook] Error generating barcode in beforeCreate, using fallback:", error.message);
            const timestamp = Date.now().toString().slice(-6);
            product.barCode = `PRD${timestamp}`;
            console.log(`✅ [Product Hook] Fallback barcode generated: ${product.barCode}`);
          }
        }
      },
    },
  }
);

// 🧠 Associations
Product.belongsTo(Brand, { foreignKey: "brandId", as: "brand" });
Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
Product.belongsTo(Unit, { foreignKey: "unitId", as: "unit" });

export default Product;
