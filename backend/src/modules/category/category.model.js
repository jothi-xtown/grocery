import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { commonFields } from "../../shared/models/commonFields.js";

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    categoryName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categoryStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    ...commonFields,
  },
  {
    tableName: "category",
    timestamps: true,
    paranoid: true,
  }
);

export default Category;
