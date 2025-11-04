// import { DataTypes } from "sequelize";
// import sequelize from "../../config/db.js";
// import { commonFields } from "../../shared/models/commonFields.js";
// import Customer from "../customer/customer.model.js";

// const Account = sequelize.define("Account", {
//   id: {
//     type: DataTypes.UUID,
//     defaultValue: DataTypes.UUIDV4,
//     primaryKey: true,
//   },
//   customerId: {
//     type: DataTypes.UUID,
//     allowNull: false,
//   },
//   totalBilled: {
//     type: DataTypes.FLOAT,
//     defaultValue: 0,
//   },
//   totalPaid: {
//     type: DataTypes.FLOAT,
//     defaultValue: 0,
//   },
//   dueAmount: {
//     type: DataTypes.FLOAT,
//     defaultValue: 0,
//   },
//   lastBillId: {
//     type: DataTypes.UUID,
//     allowNull: true,
//   },
//   lastPaymentId: {
//     type: DataTypes.UUID,
//     allowNull: true,
//   },
//   status: {
//     type: DataTypes.ENUM("clear", "due"),
//     defaultValue: "clear",
//   },
//     ...commonFields,
//     },
//     {
//       tableName: "bill",
//       timestamps: true,
//       paranoid: true,
//     }
// );

// Customer.hasOne(Account, { foreignKey: "customerId", as: "account" });
// Account.belongsTo(Customer, { foreignKey: "customerId", as: "customers" });

// export default Account;


import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import Customer from "../customer/customer.model.js";

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
      allowNull: false,
      references: {
        model: Customer,
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
    },
    lastPaymentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("due", "clear"), // ✅ Must match what you set in code
      defaultValue: "clear",
    },
  },
  {
    tableName: "accounts",
    timestamps: true,
  }
);

export default Account;
