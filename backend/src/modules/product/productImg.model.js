import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import { commonFields } from "../../shared/models/commonFields.js";
import Product from "./product.model.js";

const ProductImage = sequelize.define(
  "ProductImage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      references: {
        model: "product",
        key: "id",
      },
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Image URL or path",
    },
    ...commonFields,
  },
  {
    tableName: "product_image",
    timestamps: true,
    paranoid: true,
  }
);

// Association
Product.hasMany(ProductImage, { foreignKey: "productId", as: "images" });
ProductImage.belongsTo(Product, { foreignKey: "productId", as: "product" });

export default ProductImage;
