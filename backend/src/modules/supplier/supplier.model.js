import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { commonFields } from "../../shared/models/commonFields.js";

const Supplier = sequelize.define(
  "Supplier",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    supplierName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gstNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email:{
     type: DataTypes.STRING,
     allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    advancePaid: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    oldBalance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    creditLimit: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    availableLimit: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    ...commonFields,
  },
  {
    tableName: "supplier",
    timestamps: true,
    paranoid: true,
  }
);

export default Supplier;
