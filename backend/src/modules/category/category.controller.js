import Category from "./category.model.js";
import { BaseCrud } from "../../shared/utils/baseCrud.js";
import { BaseController } from "../../shared/utils/baseController.js";

// 1️⃣ Create CRUD service from model
const CategoryCrud = new BaseCrud(Category);

// 2️⃣ Plug it into BaseController
export const CategoryController = new BaseController(CategoryCrud, "Category");
