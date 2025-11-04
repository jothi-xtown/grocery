import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { commonFields } from "../../shared/models/commonFields.js";
import Product from "../product/product.model.js";

const Stock = sequelize.define(
  "Stock",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "product",
        key: "id",
      },
    },

    openingStock: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    purchasedQty: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    soldQty: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    currentStock: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },

    location: {
      type: DataTypes.STRING,
      allowNull: true, // warehouse/store name
    },

    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
   ...commonFields,
  },
  {
    tableName: "stock",
    timestamps: true,
    paranoid: true,
  }
);

// 🔗 Relationship
Product.hasMany(Stock, { foreignKey: "productId", as: "stockDetails" });
Stock.belongsTo(Product, { foreignKey: "productId", as: "product" });

export default Stock;
