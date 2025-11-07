import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { commonFields } from "../../shared/models/commonFields.js";
import Customer from "../customer/customer.model.js";
import Branch from "../branch/branch.model.js";
import Bill from "../bill/bill.model.js";

const Account = sequelize.define(
  "Account",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "customers",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "branch",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    totalBilled: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalPaid: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    dueAmount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    lastBillId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "bills",
        key: "id",
      },
    },
    lastPaymentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("due", "clear"),
      defaultValue: "clear",
    },
    ...commonFields,
  },
  {
    tableName: "accounts",
    timestamps: true,
    paranoid: true,
  }
);

// ✅ Associations
Customer.hasOne(Account, {
  foreignKey: "customerId",
  as: "account",
  onDelete: "CASCADE",
});

Account.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

Branch.hasOne(Account, {
  foreignKey: "branchId",
  as: "account",
  onDelete: "CASCADE",
});

Account.belongsTo(Branch, {
  foreignKey: "branchId",
  as: "branch",
});

// ✅ Account ↔ lastBill (single reference using lastBillId)
Account.belongsTo(Bill, {
  foreignKey: "lastBillId",
  as: "lastBill",
  constraints: false,
});

export default Account;