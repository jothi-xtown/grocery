import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import Bill from "./bill.model.js";

const Payment = sequelize.define(
  "Payment",
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

    paymentMode: {
      type: DataTypes.ENUM("cash", "upi", "card", "bank"),
      allowNull: false,
    },

    amountPaid: { type: DataTypes.FLOAT, allowNull: false },
    transactionId: { type: DataTypes.STRING, allowNull: true },
    paymentDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "payment",
    timestamps: true,
    paranoid: true,
  }
);

Bill.hasMany(Payment, { foreignKey: "billId", as: "payments" });
Payment.belongsTo(Bill, { foreignKey: "billId", as: "bill" });

export default Payment;
