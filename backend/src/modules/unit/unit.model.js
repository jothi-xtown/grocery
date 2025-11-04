import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { commonFields } from "../../shared/models/commonFields.js";

const Unit = sequelize.define(
  "Unit",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    unitName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unitStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    ...commonFields,
  },
  {
    tableName: "unit",
    timestamps: true,
    paranoid: true, // enables soft delete
  }
);

export default Unit;
