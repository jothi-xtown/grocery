import { Router } from "express";
import { getAccounts, getAccountByCustomer, getAccountsReceivableReport } from "./accounts.conroller.js";
import { authorize } from "../../shared/middlewares/auth.js";

const router = Router();

/* 🔹 Get all customer accounts */
router.get("/", authorize("read"), getAccounts);

/* 📊 Get Accounts Receivable Report */
router.get("/reports/receivables", authorize("read"), getAccountsReceivableReport);

/* 🔹 Get specific account details by customer ID */
router.get("/:customerId", authorize("read"), getAccountByCustomer);

export default router;