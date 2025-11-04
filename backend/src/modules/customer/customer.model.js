import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { commonFields } from "../../shared/models/commonFields.js";

const Customer = sequelize.define("Customer", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  old_balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  advance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  credit_limit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  available_limit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  gst_pan_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ...commonFields,
},
{
    tableName: "customers",
    timestamps: true,
    paranoid: true,
  });

export default Customer;
