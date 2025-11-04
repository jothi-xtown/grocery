import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { commonFields } from "../../shared/models/commonFields.js";
import Customer from "../customer/customer.model.js";

const Bill = sequelize.define(
  "Bill",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    billNo: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      comment: "Auto-generated invoice/quotation number",
    },

    type: {
      type: DataTypes.ENUM("quotation", "invoice"),
      defaultValue: "quotation",
      allowNull: false,
    },

    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "customers",
        key: "id",
      },
    },

    billDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    totalAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
    discountAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
    taxAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
    grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },

    paymentStatus: {
      type: DataTypes.ENUM("unpaid", "partial", "paid"),
      defaultValue: "unpaid",
    },

    status: {
      type: DataTypes.ENUM("active", "cancelled"),
      defaultValue: "active",
    },

    remarks: { type: DataTypes.TEXT, allowNull: true },

    ...commonFields,
  },
  {
    tableName: "bill",
    timestamps: true,
    paranoid: true,
  }
);

Customer.hasMany(Bill, { foreignKey: "customerId", as: "bills" });
Bill.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });

export default Bill;
