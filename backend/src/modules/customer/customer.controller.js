import Customer from "./customer.model.js";
import { BaseCrud } from "../../shared/utils/baseCrud.js";
import { BaseController } from "../../shared/utils/baseController.js";

// Create CRUD instance from Customer model
const CustomerCrud = new BaseCrud(Customer);

// Export controller using BaseController
export const CustomerController = new BaseController(CustomerCrud, "Customer");
