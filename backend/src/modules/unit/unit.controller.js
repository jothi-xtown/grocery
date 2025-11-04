import Unit from "./unit.model.js";
import { BaseCrud } from "../../shared/utils/baseCrud.js";
import { BaseController } from "../../shared/utils/baseController.js";

// 1️⃣ Create CRUD service from model
const UnitCrud = new BaseCrud(Unit);

// 2️⃣ Plug it into BaseController
export const UnitController = new BaseController(UnitCrud, "Unit");
