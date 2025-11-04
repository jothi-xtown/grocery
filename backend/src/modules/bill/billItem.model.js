import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import Bill from "./bill.model.js";
import Product from "../product/product.model.js";

const BillItem = sequelize.define(
  "BillItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    billId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "bill",
        key: "id",
      },
    },

    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "product",
        key: "id",
      },
    },

    quantity: { type: DataTypes.FLOAT, allowNull: false },
    unitPrice: { type: DataTypes.FLOAT, allowNull: false },
    discountPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
    taxPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
    lineTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  },
  {
    tableName: "bill_item",
    timestamps: true,
    paranoid: true,
  }
);

// Associations
Bill.hasMany(BillItem, { foreignKey: "billId", as: "items" });
BillItem.belongsTo(Bill, { foreignKey: "billId", as: "bill" });
Product.hasMany(BillItem, { foreignKey: "productId", as: "billItems" });
BillItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

export default BillItem;
