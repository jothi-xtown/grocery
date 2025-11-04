import Stock from "./stock.model.js";
import { BaseCrud } from "../../shared/utils/baseCrud.js";
import { BaseController } from "../../shared/utils/baseController.js";

// 1️⃣ Create CRUD service from the model
const StockCrud = new BaseCrud(Stock);

// 2️⃣ Plug it into BaseController
export const StockController = new BaseController(StockCrud, "Stock");
