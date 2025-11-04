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
      // Auto-generate barcode before creating a product
      beforeCreate: async (product) => {
        const lastProduct = await Product.findOne({
          order: [["createdAt", "DESC"]],
        });
        const lastNumber = lastProduct?.barCode
          ? parseInt(lastProduct.barCode.replace("PRD", "")) || 0
          : 0;
        const newNumber = (lastNumber + 1).toString().padStart(4, "0");
        product.barCode = `PRD${newNumber}`;
      },
    },
  }
);

// 🧠 Associations
Product.belongsTo(Brand, { foreignKey: "brandId", as: "brand" });
Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
Product.belongsTo(Unit, { foreignKey: "unitId", as: "unit" });

export default Product;
