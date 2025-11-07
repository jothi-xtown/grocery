// import Account from "./accounts.model.js";
// import Bill from "../bill/bill.model.js";
// import Payment from "../bill/payment.model.js";
// import Customer from "../customer/customer.model.js";

// export const getAccounts = async (req, res, next) => {
//   try {
//     const accounts = await Account.findAll({
//       include: [
//         { model: Customer, as: "customer" },
//         {
//           model: Bill,
//           as: "lastBill",
//           attributes: ["billNo", "totalAmount", "createdAt"],
//         },
//       ],
//     });

//     res.json({ success: true, data: accounts });
//   } catch (error) {
//     next(error);
//   }
// };

// export const getAccountByCustomer = async (req, res, next) => {
//   try {
//     const { customerId } = req.params;
//     const account = await Account.findOne({
//       where: { customerId },
//       include: [
//         { model: Customer, as: "customer" },
//         {
//           model: Bill,
//           as: "lastBill",
//           attributes: ["billNo", "totalAmount", "createdAt"],
//         },
//         {
//           model: Payment,
//           as: "payments",
//           attributes: ["amountPaid", "paymentMode", "createdAt"],
//         },
//       ],
//     });

//     res.json({ success: true, data: account });
//   } catch (error) {
//     next(error);
//   }

  
// };

import Account from "./accounts.model.js";
import Bill from "../bill/bill.model.js";
import Payment from "../bill/payment.model.js";
import Customer from "../customer/customer.model.js";
import Branch from "../branch/branch.model.js";
import { Op } from "sequelize";

// Ensure associations are loaded
import "../bill/bill.model.js";
import "../bill/payment.model.js";
import "../customer/customer.model.js";
import "../branch/branch.model.js";

export const getAccounts = async (req, res, next) => {
  try {
    console.log("🔍 [Accounts Controller] Fetching accounts...");
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    console.log("🔍 [Accounts Controller] Query params:", { page, limit, offset });

    // First check if Account model is properly loaded
    if (!Account) {
      console.error("❌ [Accounts Controller] Account model is not loaded");
      return res.status(500).json({
        success: false,
        message: "Account model not initialized"
      });
    }

    const { count, rows: accounts } = await Account.findAndCountAll({
      where: {
        // Paranoid is enabled, so deletedAt IS NULL is automatically added
        // But we can be explicit if needed
      },
      include: [
        { 
          model: Customer, 
          as: "customer",
          attributes: ["id", "customer_name", "phone", "pincode", "gst_pan_number"],
          required: false, // LEFT JOIN - accounts without customers can still be returned
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "branchName", "phone", "email", "address"],
          required: false, // LEFT JOIN - accounts without branches can still be returned
        },
        {
          model: Bill,
          as: "lastBill",
          attributes: ["id", "billNo", "grandTotal", "createdAt"],
          required: false, // LEFT JOIN instead of INNER JOIN
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      distinct: true, // Ensure correct count when using includes
      paranoid: true, // Explicitly enable paranoid (soft delete) mode
    });

    console.log(`✅ [Accounts Controller] Found ${count} accounts, returning ${accounts.length} rows`);
    
    // Log first account for debugging
    if (accounts.length > 0) {
      console.log(`📋 [Accounts Controller] Sample account:`, {
        id: accounts[0].id,
        customerId: accounts[0].customerId,
        branchId: accounts[0].branchId,
        customer: accounts[0].customer ? accounts[0].customer.customer_name : "No customer",
        branch: accounts[0].branch ? accounts[0].branch.branchName : "No branch",
        totalBilled: accounts[0].totalBilled,
        totalPaid: accounts[0].totalPaid,
        dueAmount: accounts[0].dueAmount,
      });
    }

    res.json({ 
      success: true, 
      data: accounts || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error("❌ [Accounts Controller] Error fetching accounts:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    // Return detailed error response
    return res.status(500).json({
      success: false,
      message: "Error fetching accounts",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

export const getAccountByCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.params; // This can be customerId or branchId

    // ✅ Validate identifier
    if (!customerId) {
      return res.status(400).json({ 
        success: false, 
        message: "Customer or Branch ID is required" 
      });
    }

    // Try to find by customerId first, then branchId
    let account = await Account.findOne({
      where: { customerId },
      include: [
        { 
          model: Customer, 
          as: "customer",
          attributes: ["id", "customer_name", "phone", "pincode", "gst_pan_number"],
          required: false,
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "branchName", "phone", "email", "address"],
          required: false,
        },
        {
          model: Bill,
          as: "lastBill",
          attributes: ["id", "billNo", "totalAmount", "createdAt"],
          required: false,
        },
      ],
    });

    // If not found by customerId, try branchId
    if (!account) {
      account = await Account.findOne({
        where: { branchId: customerId },
        include: [
          { 
            model: Customer, 
            as: "customer",
            attributes: ["id", "customer_name", "phone", "pincode", "gst_pan_number"],
            required: false,
          },
          {
            model: Branch,
            as: "branch",
            attributes: ["id", "branchName", "phone", "email", "address"],
            required: false,
          },
          {
            model: Bill,
            as: "lastBill",
            attributes: ["id", "billNo", "totalAmount", "createdAt"],
            required: false,
          },
        ],
      });
    }

    // ✅ If no account found, return null or create error
    if (!account) {
      return res.status(404).json({ 
        success: false, 
        message: "Account not found for this customer" 
      });
    }

    // ✅ Fetch payment history separately through Bills
    // First get all bills for this customer
    const customerBills = await Bill.findAll({
      where: { customerId },
      attributes: ["id"],
    });
    
    const billIds = customerBills.map((bill) => bill.id);
    
    let payments = [];
    if (billIds.length > 0) {
      payments = await Payment.findAll({
        where: { billId: billIds },
        attributes: ["id", "amountPaid", "paymentMode", "createdAt", "billId"],
        include: [
          {
            model: Bill,
            as: "bill",
            attributes: ["billNo", "customerId"],
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 50,
      });
    }

    // ✅ Attach payments to account object
    const accountData = account.toJSON();
    accountData.payments = payments;

    res.json({ success: true, data: accountData });
  } catch (error) {
    console.error("Error fetching account by customer:", error);
    next(error);
  }
};

/* ──────────────────────────────
   🔹 Get Accounts Receivable Report
───────────────────────────────── */
export const getAccountsReceivableReport = async (req, res, next) => {
  try {
    const { customerId } = req.query;
    
    // Build where clause
    const whereClause = {
      status: "due",
      dueAmount: {
        [Op.gt]: 0,
      },
    };
    
    if (customerId) whereClause.customerId = customerId;
    
    // Fetch accounts with customers and last bill
    const accounts = await Account.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "customer_name", "phone", "pincode"],
          required: false,
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "branchName"],
          required: false,
        },
        {
          model: Bill,
          as: "lastBill",
          attributes: ["id", "billNo", "billDate", "grandTotal"],
          required: false,
        },
      ],
      order: [["dueAmount", "DESC"]],
    });
    
    // Process data with aging analysis
    const now = new Date();
    let totalReceivables = 0;
    let customersWithDues = 0;
    let totalDaysOverdue = 0;
    const agingBuckets = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    };
    const receivablesData = [];
    
    accounts.forEach((account) => {
      const dueAmount = parseFloat(account.dueAmount) || 0;
      if (dueAmount <= 0) return;
      
      totalReceivables += dueAmount;
      customersWithDues++;
      
      // Calculate days overdue from last bill date
      let daysOverdue = 0;
      let agingBucket = "0-30";
      
      if (account.lastBill?.billDate) {
        const billDate = new Date(account.lastBill.billDate);
        const diffTime = now - billDate;
        daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        totalDaysOverdue += daysOverdue;
        
        if (daysOverdue <= 30) {
          agingBucket = "0-30";
          agingBuckets["0-30"] += dueAmount;
        } else if (daysOverdue <= 60) {
          agingBucket = "31-60";
          agingBuckets["31-60"] += dueAmount;
        } else if (daysOverdue <= 90) {
          agingBucket = "61-90";
          agingBuckets["61-90"] += dueAmount;
        } else {
          agingBucket = "90+";
          agingBuckets["90+"] += dueAmount;
        }
      } else {
        // If no last bill date, assume it's in the oldest bucket
        agingBucket = "90+";
        agingBuckets["90+"] += dueAmount;
      }
      
      receivablesData.push({
        id: account.id,
        customer: account.customer?.customer_name || "Unknown",
        customerId: account.customerId,
        branch: account.branch?.branchName || "-",
        phone: account.customer?.phone || "-",
        totalBilled: parseFloat(account.totalBilled || 0).toFixed(2),
        totalPaid: parseFloat(account.totalPaid || 0).toFixed(2),
        dueAmount: parseFloat(dueAmount.toFixed(2)),
        daysOverdue,
        agingBucket,
        lastBillNo: account.lastBill?.billNo || "-",
        lastBillDate: account.lastBill?.billDate || "-",
      });
    });
    
    const avgDaysOverdue = customersWithDues > 0 ? Math.round(totalDaysOverdue / customersWithDues) : 0;
    
    res.json({
      success: true,
      data: {
        receivablesData,
        summary: {
          totalReceivables: parseFloat(totalReceivables.toFixed(2)),
          customersWithDues,
          avgDaysOverdue,
          agingBuckets: {
            "0-30": parseFloat(agingBuckets["0-30"].toFixed(2)),
            "31-60": parseFloat(agingBuckets["31-60"].toFixed(2)),
            "61-90": parseFloat(agingBuckets["61-90"].toFixed(2)),
            "90+": parseFloat(agingBuckets["90+"].toFixed(2)),
          },
        },
      },
    });
  } catch (error) {
    console.error("Error in getAccountsReceivableReport:", error);
    next(error);
  }
};