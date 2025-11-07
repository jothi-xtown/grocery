import Branch from "./branch.model.js";
import { BaseCrud } from "../../shared/utils/baseCrud.js";
import { BaseController } from "../../shared/utils/baseController.js";

// 1. Create CRUD service from model
const BranchCrud = new BaseCrud(Branch);

// 2. Plug it into BaseController
export const BranchController = new BaseController(BranchCrud, "Branch");
