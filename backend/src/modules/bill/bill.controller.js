// // import { BaseController } from "../../shared/utils/baseController.js";
// // import { BaseCrud } from "../../shared/utils/baseCrud.js";
// // import Bill from "./bill.model.js";
// // import BillItem from "./billItem.model.js";
// // import Product from "../product/product.model.js";
// // import Payment from "./payment.model.js";
// // import { generateBillNumber } from "../../shared/utils/generateBillNumber.js";
// // import sequelize from "../../config/db.js";

// // // Base CRUD for Bill
// // const BillCrud = new BaseCrud(Bill);

// // class BillControllerClass extends BaseController {
// //   constructor() {
// //     super(BillCrud, "Bill");
// //   }

// //   /* ──────────────────────────────
// //      🔹 Create Bill (Quotation / Invoice)
// //   ───────────────────────────────── */
// //   create = async (req, res, next) => {
// //     const { type, customerId, items, remarks } = req.body;
// //     const createdBy = req.user?.id; // ✅ get from token

// //     if (!items || !items.length)
// //       return res.status(400).json({ message: "Items are required" });

// //     const t = await sequelize.transaction();
// //     try {
// //       const billNo = await generateBillNumber(type);

// //       const bill = await Bill.create(
// //         { billNo, type, customerId, remarks, createdBy },
// //         { transaction: t }
// //       );

// //       let total = 0;

// //       for (const item of items) {
// //         const {
// //           productId,
// //           quantity,
// //           unitPrice,
// //           discountPercent = 0,
// //           taxPercent = 0,
// //         } = item;

// //         const lineAmount = quantity * unitPrice;
// //         const discount = (lineAmount * discountPercent) / 100;
// //         const taxable = lineAmount - discount;
// //         const tax = (taxable * taxPercent) / 100;
// //         const lineTotal = taxable + tax;
// //         total += lineTotal;

// //         await BillItem.create(
// //           {
// //             billId: bill.id,
// //             productId,
// //             quantity,
// //             unitPrice,
// //             discountPercent,
// //             taxPercent,
// //             lineTotal,
// //           },
// //           { transaction: t }
// //         );

// //         // 🧮 Reduce stock only for invoices
// //         if (type === "invoice") {
// //           const product = await Product.findByPk(productId);
// //           if (!product || product.stock < quantity)
// //             throw new Error(
// //               `Insufficient stock for ${product?.name || productId}`
// //             );
// //           product.stock -= quantity;
// //           await product.save({ transaction: t });
// //         }
// //       }

// //       bill.totalAmount = total;
// //       bill.grandTotal = total;
// //       await bill.save({ transaction: t });

// //       await t.commit();

// //       res.status(201).json({
// //         success: true,
// //         message: `${type} created successfully`,
// //         data: bill,
// //       });
// //     } catch (error) {
// //       await t.rollback();
// //       next(error);
// //     }
// //   };

// //   /* ──────────────────────────────
// //      🔹 Convert Quotation → Invoice
// //   ───────────────────────────────── */
// //   convertToInvoice = async (req, res, next) => {
// //     const { id } = req.params;
// //     const t = await sequelize.transaction();
// //     try {
// //       const quotation = await Bill.findByPk(id, {
// //         include: { model: BillItem, as: "items" },
// //       });

// //       if (!quotation) throw new Error("Quotation not found");
// //       if (quotation.type !== "quotation")
// //         throw new Error("Only quotations can be converted");

// //       quotation.type = "invoice";
// //       quotation.billNo = await generateBillNumber("invoice");

// //       // 🧮 Deduct stock
// //       for (const item of quotation.items) {
// //         const product = await Product.findByPk(item.productId);
// //         if (!product || product.stock < item.quantity)
// //           throw new Error(`Insufficient stock for ${product?.name}`);
// //         product.stock -= item.quantity;
// //         await product.save({ transaction: t });
// //       }

// //       await quotation.save({ transaction: t });
// //       await t.commit();

// //       res.json({
// //         success: true,
// //         message: "Quotation converted to invoice",
// //         data: quotation,
// //       });
// //     } catch (error) {
// //       await t.rollback();
// //       next(error);
// //     }
// //   };

// //   /* ──────────────────────────────
// //      🔹 Add Payment to Invoice
// //   ───────────────────────────────── */
// //   addPayment = async (req, res, next) => {
// //     const { billId, paymentMode, amountPaid, transactionId } = req.body;
// //     const createdBy = req.user?.id;

// //     const t = await sequelize.transaction();
// //     try {
// //       const bill = await Bill.findByPk(billId, {
// //         include: { model: Payment, as: "payments" },
// //       });

// //       if (!bill) throw new Error("Bill not found");
// //       if (bill.type !== "invoice")
// //         throw new Error("Payments only apply to invoices");

// //       await Payment.create(
// //         { billId, paymentMode, amountPaid, transactionId, createdBy },
// //         { transaction: t }
// //       );

// //       const totalPaid =
// //         bill.payments.reduce((sum, p) => sum + p.amountPaid, 0) +
// //         parseFloat(amountPaid);

// //       bill.paymentStatus =
// //         totalPaid >= bill.grandTotal
// //           ? "paid"
// //           : totalPaid > 0
// //           ? "partial"
// //           : "unpaid";

// //       await bill.save({ transaction: t });
// //       await t.commit();

// //       res.json({
// //         success: true,
// //         message: "Payment added successfully",
// //         paymentStatus: bill.paymentStatus,
// //       });
// //     } catch (error) {
// //       await t.rollback();
// //       next(error);
// //     }
// //   };
// // }

// // export const BillController = new BillControllerClass();



// import { BaseController } from "../../shared/utils/baseController.js";
// import { BaseCrud } from "../../shared/utils/baseCrud.js";
// import Bill from "./bill.model.js";
// import BillItem from "./billItem.model.js";
// import Product from "../product/product.model.js";
// import Payment from "./payment.model.js";
// import Customer from "../customer/customer.model.js";
// import { generateBillNumber } from "../../shared/utils/generateBillNumber.js";
// import sequelize from "../../config/db.js";

// // Base CRUD for Bill
// const BillCrud = new BaseCrud(Bill);

// class BillControllerClass extends BaseController {
//   constructor() {
//     super(BillCrud, "Bill");
//   }

//   /* ──────────────────────────────
//      🔹 Create Bill (Quotation / Invoice)
//   ───────────────────────────────── */
//   create = async (req, res, next) => {
//     const { type, customerId, items, remarks } = req.body;
//     const createdBy = req.user?.id;

//     if (!items || !items.length)
//       return res.status(400).json({ message: "Items are required" });

//     const t = await sequelize.transaction();
//     try {
//       const billNo = await generateBillNumber(type);

//       const bill = await Bill.create(
//         { billNo, type, customerId, remarks, createdBy },
//         { transaction: t }
//       );

//       let total = 0;

//       for (const item of items) {
//         const {
//           productId,
//           quantity,
//           unitPrice,
//           discountPercent = 0,
//           taxPercent = 0,
//         } = item;

//         const lineAmount = quantity * unitPrice;
//         const discount = (lineAmount * discountPercent) / 100;
//         const taxable = lineAmount - discount;
//         const tax = (taxable * taxPercent) / 100;
//         const lineTotal = taxable + tax;
//         total += lineTotal;

//         await BillItem.create(
//           {
//             billId: bill.id,
//             productId,
//             quantity,
//             unitPrice,
//             discountPercent,
//             taxPercent,
//             lineTotal,
//           },
//           { transaction: t }
//         );

//         // 🧮 Reduce stock only for invoices
//         if (type === "invoice") {
//           const product = await Product.findByPk(productId);
//           if (!product || product.stock < quantity)
//             throw new Error(
//               `Insufficient stock for ${product?.name || productId}`
//             );
//           product.stock -= quantity;
//           await product.save({ transaction: t });
//         }
//       }

//       bill.totalAmount = total;
//       bill.grandTotal = total;
//       await bill.save({ transaction: t });

//       await t.commit();

//       res.status(201).json({
//         success: true,
//         message: `${type} created successfully`,
//         data: bill,
//       });
//     } catch (error) {
//       await t.rollback();
//       next(error);
//     }
//   };

//   /* ──────────────────────────────
//      🔹 Get All Bills (with Items, Customer & Payments)
//   ───────────────────────────────── */
//   getAll = async (req, res, next) => {
//     try {
//       const bills = await Bill.findAll({
//         include: [
//           { model: Customer, as: "customer" },
//           { model: BillItem, as: "items", include: [{ model: Product, as: "product" }] },
//           { model: Payment, as: "payments" },
//         ],
//         order: [["createdAt", "DESC"]],
//       });
//       res.json({ success: true, data: bills });
//     } catch (error) {
//       next(error);
//     }
//   };

//   /* ──────────────────────────────
//      🔹 Get Bill By ID (with Items & Payments)
//   ───────────────────────────────── */
//   getById = async (req, res, next) => {
//     const { id } = req.params;
//     try {
//       const bill = await Bill.findByPk(id, {
//         include: [
//           { model: Customer, as: "customer" },
//           { model: BillItem, as: "items", include: [{ model: Product, as: "product" }] },
//           { model: Payment, as: "payments" },
//         ],
//       });

//       if (!bill) return res.status(404).json({ message: "Bill not found" });

//       res.json({ success: true, data: bill });
//     } catch (error) {
//       next(error);
//     }
//   };

//   /* ──────────────────────────────
//      🔹 Update Bill + Bill Items
//   ───────────────────────────────── */
//   update = async (req, res, next) => {
//     const { id } = req.params;
//     const { items, remarks, customerId, type } = req.body;
//     const updatedBy = req.user?.id;

//     const t = await sequelize.transaction();
//     try {
//       const bill = await Bill.findByPk(id, { include: { model: BillItem, as: "items" } });
//       if (!bill) throw new Error("Bill not found");

//       // Update basic details
//       bill.customerId = customerId || bill.customerId;
//       bill.remarks = remarks || bill.remarks;
//       bill.type = type || bill.type;
//       bill.updatedBy = updatedBy;
//       await bill.save({ transaction: t });

//       if (items && items.length) {
//         // Remove existing items
//         await BillItem.destroy({ where: { billId: bill.id }, transaction: t });

//         let total = 0;
//         for (const item of items) {
//           const {
//             productId,
//             quantity,
//             unitPrice,
//             discountPercent = 0,
//             taxPercent = 0,
//           } = item;

//           const lineAmount = quantity * unitPrice;
//           const discount = (lineAmount * discountPercent) / 100;
//           const taxable = lineAmount - discount;
//           const tax = (taxable * taxPercent) / 100;
//           const lineTotal = taxable + tax;
//           total += lineTotal;

//           await BillItem.create(
//             {
//               billId: bill.id,
//               productId,
//               quantity,
//               unitPrice,
//               discountPercent,
//               taxPercent,
//               lineTotal,
//             },
//             { transaction: t }
//           );
//         }

//         bill.totalAmount = total;
//         bill.grandTotal = total;
//         await bill.save({ transaction: t });
//       }

//       await t.commit();
//       res.json({ success: true, message: "Bill updated successfully", data: bill });
//     } catch (error) {
//       await t.rollback();
//       next(error);
//     }
//   };

//   /* ──────────────────────────────
//      🔹 Convert Quotation → Invoice
//   ───────────────────────────────── */
//   convertToInvoice = async (req, res, next) => {
//     const { id } = req.params;
//     const t = await sequelize.transaction();
//     try {
//       const quotation = await Bill.findByPk(id, {
//         include: { model: BillItem, as: "items" },
//       });

//       if (!quotation) throw new Error("Quotation not found");
//       if (quotation.type !== "quotation")
//         throw new Error("Only quotations can be converted");

//       quotation.type = "invoice";
//       quotation.billNo = await generateBillNumber("invoice");

//       // 🧮 Deduct stock
//       for (const item of quotation.items) {
//         const product = await Product.findByPk(item.productId);
//         if (!product || product.stock < item.quantity)
//           throw new Error(`Insufficient stock for ${product?.name}`);
//         product.stock -= item.quantity;
//         await product.save({ transaction: t });
//       }

//       await quotation.save({ transaction: t });
//       await t.commit();

//       res.json({
//         success: true,
//         message: "Quotation converted to invoice",
//         data: quotation,
//       });
//     } catch (error) {
//       await t.rollback();
//       next(error);
//     }
//   };

//   /* ──────────────────────────────
//      🔹 Add Payment to Invoice
//   ───────────────────────────────── */
//   addPayment = async (req, res, next) => {
//     const { billId, paymentMode, amountPaid, transactionId } = req.body;
//     const createdBy = req.user?.id;

//     const t = await sequelize.transaction();
//     try {
//       const bill = await Bill.findByPk(billId, {
//         include: { model: Payment, as: "payments" },
//       });

//       if (!bill) throw new Error("Bill not found");
//       if (bill.type !== "invoice")
//         throw new Error("Payments only apply to invoices");

//       await Payment.create(
//         { billId, paymentMode, amountPaid, transactionId, createdBy },
//         { transaction: t }
//       );

//       const totalPaid =
//         bill.payments.reduce((sum, p) => sum + p.amountPaid, 0) +
//         parseFloat(amountPaid);

//       bill.paymentStatus =
//         totalPaid >= bill.grandTotal
//           ? "paid"
//           : totalPaid > 0
//           ? "partial"
//           : "unpaid";

//       await bill.save({ transaction: t });
//       await t.commit();

//       res.json({
//         success: true,
//         message: "Payment added successfully",
//         paymentStatus: bill.paymentStatus,
//       });
//     } catch (error) {
//       await t.rollback();
//       next(error);
//     }
//   };
// }

// export const BillController = new BillControllerClass();


import { BaseController } from "../../shared/utils/baseController.js";
import { BaseCrud } from "../../shared/utils/baseCrud.js";
import Bill from "./bill.model.js";
import BillItem from "./billItem.model.js";
import Product from "../product/product.model.js";
import Stock from "../stock/stock.model.js";
import Payment from "./payment.model.js";
import Customer from "../customer/customer.model.js";
import Branch from "../branch/branch.model.js";
import Account from "../accounts/accounts.model.js";
import { generateBillNumber } from "../../shared/utils/generateBillNumber.js";
import sequelize from "../../config/db.js";
import { Op } from "sequelize";

const BillCrud = new BaseCrud(Bill);

class BillControllerClass extends BaseController {
  constructor() {
    super(BillCrud, "Bill");
  }

  /* ──────────────────────────────
     🔹 Create Bill (Quotation / Invoice)
  ───────────────────────────────── */
  create = async (req, res, next) => {
    const { type, customerId, branchId, items, remarks } = req.body;
    const createdBy = req.user?.id;

    if (!items || !items.length)
      return res.status(400).json({ 
        success: false,
        message: "Items are required" 
      });

    const t = await sequelize.transaction();
    try {
      const billNo = await generateBillNumber(type);

      // Normalize customerId and branchId: convert empty strings to null
      const normalizedCustomerId = customerId && customerId.trim() !== "" ? customerId : null;
      const normalizedBranchId = branchId && branchId.trim() !== "" ? branchId : null;

      const bill = await Bill.create(
        { billNo, type, customerId: normalizedCustomerId, branchId: normalizedBranchId, remarks, createdBy },
        { transaction: t }
      );

      let total = 0;

      for (const item of items) {
        const {
          productId,
          quantity,
          unitPrice,
          discountPercent = 0,
          taxPercent = 0,
        } = item;

        const lineAmount = quantity * unitPrice;
        const discount = (lineAmount * discountPercent) / 100;
        const taxable = lineAmount - discount;
        const tax = (taxable * taxPercent) / 100;
        const lineTotal = taxable + tax;
        total += lineTotal;

        await BillItem.create(
          {
            billId: bill.id,
            productId,
            quantity,
            unitPrice,
            discountPercent,
            taxPercent,
            lineTotal,
          },
          { transaction: t }
        );

        if (type === "invoice") {
          const product = await Product.findByPk(productId, { transaction: t });
          if (!product) {
            throw new Error(`Product not found: ${productId}`);
          }

          // Get stock record for the product
          let stock = await Stock.findOne({
            where: { productId },
            transaction: t
          });

          if (!stock) {
            throw new Error(
              `Stock record not found for product: ${product.productName || productId}. Please add stock for this product first.`
            );
          }

          // Check if sufficient stock is available
          if (stock.currentStock < quantity) {
            throw new Error(
              `Insufficient stock for ${product.productName || productId}. Available: ${stock.currentStock}, Required: ${quantity}`
            );
          }

          // Update stock: increase soldQty and decrease currentStock
          stock.soldQty = (stock.soldQty || 0) + quantity;
          stock.currentStock = stock.currentStock - quantity;
          stock.lastUpdated = new Date();
          stock.updatedBy = req.user?.username || req.user?.id || "system";
          await stock.save({ transaction: t });
        }
      }

      bill.totalAmount = total;
      bill.grandTotal = total;
      await bill.save({ transaction: t });

      // ✅ Update Account if invoice (for customerId or branchId)
      if (type === "invoice") {
        try {
          const accountIdentifier = normalizedCustomerId || normalizedBranchId;
          if (accountIdentifier) {
            const whereClause = normalizedCustomerId 
              ? { customerId: normalizedCustomerId }
              : { branchId: normalizedBranchId };
            
            console.log(`🔍 [Bill Controller] Creating/updating account for invoice, identifier: ${accountIdentifier}, total: ${total}`);
            let account = await Account.findOne({ 
              where: whereClause,
              transaction: t 
            });
            
            if (!account) {
              console.log(`📝 [Bill Controller] Creating new account for ${normalizedCustomerId ? 'customer' : 'branch'} ${accountIdentifier}`);
              account = await Account.create({
                customerId: normalizedCustomerId || null,
                branchId: normalizedBranchId || null,
                totalBilled: total,
                totalPaid: 0,
                dueAmount: total,
                lastBillId: bill.id,
                status: total > 0 ? "due" : "clear",
                createdBy: req.user?.username || req.user?.id || "system",
              }, { transaction: t });
              console.log(`✅ [Bill Controller] Account created successfully: ${account.id}`);
            } else {
              console.log(`📝 [Bill Controller] Updating existing account ${account.id}`);
              account.totalBilled = (account.totalBilled || 0) + total;
              account.dueAmount = (account.dueAmount || 0) + total;
              account.lastBillId = bill.id;
              account.status = account.dueAmount > 0 ? "due" : "clear";
              account.updatedBy = req.user?.username || req.user?.id || "system";
              await account.save({ transaction: t });
              console.log(`✅ [Bill Controller] Account updated successfully: ${account.id}`);
            }
          }
        } catch (accountError) {
          console.error("❌ [Bill Controller] Error creating/updating account:", accountError);
          console.error("Account error stack:", accountError.stack);
          // Don't fail bill creation if account creation fails, but log it
          // This ensures bills are still created even if account creation has issues
        }
      }

      await t.commit();
      res.status(201).json({
        success: true,
        message: `${type} created successfully`,
        data: bill,
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  };

  /* ──────────────────────────────
     🔹 Get All Bills
  ───────────────────────────────── */
  getAll = async (req, res, next) => {
    try {
      const { startDate, endDate, type } = req.query;
      
      // Build where clause for date filtering
      const whereClause = {};
      if (startDate || endDate) {
        whereClause.billDate = {};
        if (startDate) {
          whereClause.billDate[Op.gte] = startDate;
        }
        if (endDate) {
          whereClause.billDate[Op.lte] = endDate;
        }
      }
      
      // Filter by type if provided
      if (type) {
        whereClause.type = type;
      }
      
      const bills = await Bill.findAll({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        include: [
          { model: Customer, as: "customer" },
          { model: Branch, as: "branch", required: false },
          { model: BillItem, as: "items", include: [{ model: Product, as: "product" }] },
          { model: Payment, as: "payments" },
        ],
        order: [["createdAt", "DESC"]],
      });
      res.json({ success: true, data: bills });
    } catch (error) {
      next(error);
    }
  };

  /* ──────────────────────────────
     🔹 Get Bill By ID
  ───────────────────────────────── */
  getById = async (req, res, next) => {
    const { id } = req.params;
    try {
      const bill = await Bill.findByPk(id, {
        include: [
          { model: Customer, as: "customer" },
          { model: Branch, as: "branch", required: false },
          { model: BillItem, as: "items", include: [{ model: Product, as: "product" }] },
          { model: Payment, as: "payments" },
        ],
      });

      if (!bill) return res.status(404).json({ message: "Bill not found" });

      res.json({ success: true, data: bill });
    } catch (error) {
      next(error);
    }
  };

  /* ──────────────────────────────
     🔹 Update Bill + Items
  ───────────────────────────────── */
  update = async (req, res, next) => {
    const { id } = req.params;
    const { items, remarks, customerId, branchId, type } = req.body;
    const updatedBy = req.user?.id;

    const t = await sequelize.transaction();
    try {
      const bill = await Bill.findByPk(id, { include: { model: BillItem, as: "items" } });
      if (!bill) throw new Error("Bill not found");

      // Normalize customerId and branchId: convert empty strings to null
      const normalizedCustomerId = customerId !== undefined 
        ? (customerId && customerId.trim() !== "" ? customerId : null)
        : bill.customerId;
      const normalizedBranchId = branchId !== undefined
        ? (branchId && branchId.trim() !== "" ? branchId : null)
        : bill.branchId;

      // Check if customerId or branchId changed
      const customerIdChanged = normalizedCustomerId !== bill.customerId;
      const branchIdChanged = normalizedBranchId !== bill.branchId;
      const identifierChanged = customerIdChanged || branchIdChanged;

      // Store old identifiers for account migration
      const oldCustomerId = bill.customerId;
      const oldBranchId = bill.branchId;

      bill.customerId = normalizedCustomerId;
      bill.branchId = normalizedBranchId;
      bill.remarks = remarks || bill.remarks;
      bill.type = type || bill.type;
      bill.updatedBy = updatedBy;
      await bill.save({ transaction: t });

      // ✅ Update account if customerId or branchId changed (for invoices only)
      if (identifierChanged && bill.type === "invoice") {
        try {
          const oldIdentifier = oldCustomerId || oldBranchId;
          const newIdentifier = normalizedCustomerId || normalizedBranchId;
          
          if (oldIdentifier && newIdentifier && oldIdentifier !== newIdentifier) {
            // Find old account
            const oldWhereClause = oldCustomerId 
              ? { customerId: oldCustomerId }
              : { branchId: oldBranchId };
            
            const oldAccount = await Account.findOne({
              where: oldWhereClause,
              transaction: t
            });

            // Get payments for this bill to calculate total paid
            const billPayments = await Payment.findAll({
              where: { billId: bill.id },
              transaction: t
            });
            const totalPaidForBill = billPayments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
            const billAmount = bill.grandTotal || 0;

            // Find or create new account
            const newWhereClause = normalizedCustomerId 
              ? { customerId: normalizedCustomerId }
              : { branchId: normalizedBranchId };
            
            let newAccount = await Account.findOne({
              where: newWhereClause,
              transaction: t
            });

            if (!newAccount) {
              // Create new account for the new identifier
              newAccount = await Account.create({
                customerId: normalizedCustomerId || null,
                branchId: normalizedBranchId || null,
                totalBilled: billAmount,
                totalPaid: totalPaidForBill,
                dueAmount: Math.max(billAmount - totalPaidForBill, 0),
                lastBillId: bill.id,
                status: (billAmount - totalPaidForBill) > 0 ? "due" : "clear",
                createdBy: updatedBy || "system",
              }, { transaction: t });
            } else {
              // Update existing account - add this bill's amounts
              newAccount.totalBilled = (newAccount.totalBilled || 0) + billAmount;
              newAccount.totalPaid = (newAccount.totalPaid || 0) + totalPaidForBill;
              newAccount.dueAmount = Math.max((newAccount.totalBilled || 0) - (newAccount.totalPaid || 0), 0);
              newAccount.lastBillId = bill.id;
              newAccount.status = newAccount.dueAmount > 0 ? "due" : "clear";
              newAccount.updatedBy = updatedBy || "system";
              await newAccount.save({ transaction: t });
            }

            // If old account exists and is different, remove this bill's amounts from it
            if (oldAccount && oldAccount.id !== newAccount.id) {
              oldAccount.totalBilled = Math.max((oldAccount.totalBilled || 0) - billAmount, 0);
              oldAccount.totalPaid = Math.max((oldAccount.totalPaid || 0) - totalPaidForBill, 0);
              oldAccount.dueAmount = Math.max((oldAccount.totalBilled || 0) - (oldAccount.totalPaid || 0), 0);
              oldAccount.status = oldAccount.dueAmount > 0 ? "due" : "clear";
              oldAccount.updatedBy = updatedBy || "system";
              await oldAccount.save({ transaction: t });
            }
          } else if (newIdentifier && !oldIdentifier) {
            // Bill was created without customer/branch, now has one - create/update account
            const newWhereClause = normalizedCustomerId 
              ? { customerId: normalizedCustomerId }
              : { branchId: normalizedBranchId };
            
            let newAccount = await Account.findOne({
              where: newWhereClause,
              transaction: t
            });

            const billPayments = await Payment.findAll({
              where: { billId: bill.id },
              transaction: t
            });
            const totalPaidForBill = billPayments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
            const billAmount = bill.grandTotal || 0;

            if (!newAccount) {
              newAccount = await Account.create({
                customerId: normalizedCustomerId || null,
                branchId: normalizedBranchId || null,
                totalBilled: billAmount,
                totalPaid: totalPaidForBill,
                dueAmount: Math.max(billAmount - totalPaidForBill, 0),
                lastBillId: bill.id,
                status: (billAmount - totalPaidForBill) > 0 ? "due" : "clear",
                createdBy: updatedBy || "system",
              }, { transaction: t });
            } else {
              newAccount.totalBilled = (newAccount.totalBilled || 0) + billAmount;
              newAccount.totalPaid = (newAccount.totalPaid || 0) + totalPaidForBill;
              newAccount.dueAmount = Math.max((newAccount.totalBilled || 0) - (newAccount.totalPaid || 0), 0);
              newAccount.lastBillId = bill.id;
              newAccount.status = newAccount.dueAmount > 0 ? "due" : "clear";
              newAccount.updatedBy = updatedBy || "system";
              await newAccount.save({ transaction: t });
            }
          }
        } catch (accountError) {
          console.error("❌ [Bill Controller] Error updating account during bill update:", accountError);
          console.error("Account error stack:", accountError.stack);
          // Don't fail bill update if account update fails
        }
      }

      if (items && Array.isArray(items)) {
        const existingItems = await BillItem.findAll({ where: { billId: id } });
        const existingIds = existingItems.map(i => i.id);
        const receivedIds = items.map(i => i.id).filter(Boolean);

        // Delete removed items
        const itemsToDelete = existingIds.filter(id => !receivedIds.includes(id));
        if (itemsToDelete.length) {
          await BillItem.destroy({ where: { id: itemsToDelete }, transaction: t });
        }

        let total = 0;

        for (const item of items) {
          const {
            id: itemId,
            productId,
            quantity,
            unitPrice,
            discountPercent = 0,
            taxPercent = 0,
          } = item;

          const lineAmount = quantity * unitPrice;
          const discount = (lineAmount * discountPercent) / 100;
          const taxable = lineAmount - discount;
          const tax = (taxable * taxPercent) / 100;
          const lineTotal = taxable + tax;
          total += lineTotal;

          if (itemId && existingIds.includes(itemId)) {
            // Update existing item
            await BillItem.update(
              {
                productId,
                quantity,
                unitPrice,
                discountPercent,
                taxPercent,
                lineTotal,
              },
              { where: { id: itemId }, transaction: t }
            );
          } else {
            // Create new item
            await BillItem.create(
              {
                billId: bill.id,
                productId,
                quantity,
                unitPrice,
                discountPercent,
                taxPercent,
                lineTotal,
              },
              { transaction: t }
            );
          }
        }

        bill.totalAmount = total;
        bill.grandTotal = total;
        await bill.save({ transaction: t });
      }

      await t.commit();
      res.json({
        success: true,
        message: "Bill updated successfully",
        data: bill,
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  };

  /* ──────────────────────────────
     🔹 Convert Quotation → Invoice
  ───────────────────────────────── */
  convertToInvoice = async (req, res, next) => {
    const { id } = req.params;
    const t = await sequelize.transaction();
    try {
      const quotation = await Bill.findByPk(id, {
        include: { model: BillItem, as: "items" },
      });

      if (!quotation) throw new Error("Quotation not found");
      if (quotation.type !== "quotation")
        throw new Error("Only quotations can be converted");

      quotation.type = "invoice";
      quotation.billNo = await generateBillNumber("invoice");

      for (const item of quotation.items) {
        const product = await Product.findByPk(item.productId, { transaction: t });
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        // Get stock record for the product
        let stock = await Stock.findOne({
          where: { productId: item.productId },
          transaction: t
        });

        if (!stock) {
          throw new Error(
            `Stock record not found for product: ${product.productName || item.productId}. Please add stock for this product first.`
          );
        }

        // Check if sufficient stock is available
        if (stock.currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.productName || item.productId}. Available: ${stock.currentStock}, Required: ${item.quantity}`
          );
        }

        // Update stock: increase soldQty and decrease currentStock
        stock.soldQty = (stock.soldQty || 0) + item.quantity;
        stock.currentStock = stock.currentStock - item.quantity;
        stock.lastUpdated = new Date();
        stock.updatedBy = req.user?.username || req.user?.id || "system";
        await stock.save({ transaction: t });
      }

      await quotation.save({ transaction: t });

      // ✅ Create/Update Account when converting to invoice (for customerId or branchId)
      try {
        const accountIdentifier = quotation.customerId || quotation.branchId;
        const total = quotation.grandTotal || 0;
        
        if (accountIdentifier) {
          const whereClause = quotation.customerId 
            ? { customerId: quotation.customerId }
            : { branchId: quotation.branchId };
          
          console.log(`🔍 [Bill Controller] Creating/updating account for converted invoice, identifier: ${accountIdentifier}, grandTotal: ${total}`);
          let account = await Account.findOne({ 
            where: whereClause,
            transaction: t 
          });
          
          if (!account) {
            console.log(`📝 [Bill Controller] Creating new account for ${quotation.customerId ? 'customer' : 'branch'} ${accountIdentifier} (converted invoice)`);
            account = await Account.create({
              customerId: quotation.customerId || null,
              branchId: quotation.branchId || null,
              totalBilled: total,
              totalPaid: 0,
              dueAmount: total,
              lastBillId: quotation.id,
              status: total > 0 ? "due" : "clear",
              createdBy: req.user?.username || req.user?.id || "system",
            }, { transaction: t });
            console.log(`✅ [Bill Controller] Account created successfully for converted invoice: ${account.id}`);
          } else {
            console.log(`📝 [Bill Controller] Updating existing account ${account.id} (converted invoice)`);
            account.totalBilled = (account.totalBilled || 0) + total;
            account.dueAmount = (account.dueAmount || 0) + total;
            account.lastBillId = quotation.id;
            account.status = account.dueAmount > 0 ? "due" : "clear";
            account.updatedBy = req.user?.username || req.user?.id || "system";
            await account.save({ transaction: t });
            console.log(`✅ [Bill Controller] Account updated successfully for converted invoice: ${account.id}`);
          }
        }
      } catch (accountError) {
        console.error("❌ [Bill Controller] Error creating/updating account for converted invoice:", accountError);
        console.error("Account error stack:", accountError.stack);
        // Don't fail conversion if account creation fails, but log it
      }

      await t.commit();

      res.json({
        success: true,
        message: "Quotation converted to invoice",
        data: quotation,
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  };

  /* ──────────────────────────────
     🔹 Add Payment to Invoice
  ───────────────────────────────── */
  // addPayment = async (req, res, next) => {
  //   const { billId, paymentMode, amountPaid, transactionId } = req.body;
  //   const createdBy = req.user?.id;

  //   const t = await sequelize.transaction();
  //   try {
  //     const bill = await Bill.findByPk(billId, {
  //       include: { model: Payment, as: "payments" },
  //     });

  //     if (!bill) throw new Error("Bill not found");
  //     if (bill.type !== "invoice")
  //       throw new Error("Payments only apply to invoices");

  //     await Payment.create(
  //       { billId, paymentMode, amountPaid, transactionId, createdBy },
  //       { transaction: t }
  //     );

  //     const totalPaid =
  //       bill.payments.reduce((sum, p) => sum + p.amountPaid, 0) +
  //       parseFloat(amountPaid);

  //     bill.paymentStatus =
  //       totalPaid >= bill.grandTotal
  //         ? "paid"
  //         : totalPaid > 0
  //         ? "partial"
  //         : "unpaid";

  //     await bill.save({ transaction: t });

  //     // ✅ Update account
  //     const account = await Account.findOne({ where: { customerId: bill.customerId } });
  //     if (account) {
  //       account.totalPaid += parseFloat(amountPaid);
  //       account.dueAmount = Math.max(account.totalBilled - account.totalPaid, 0);
  //       account.lastPaymentId = bill.id;
  //       account.status = account.dueAmount > 0 ? "due" : "clear";
  //       await account.save({ transaction: t });
  //     }

  //     await t.commit();

  //     res.json({
  //       success: true,
  //       message: "Payment added successfully",
  //       paymentStatus: bill.paymentStatus,
  //     });
  //   } catch (error) {
  //     await t.rollback();
  //     next(error);
  //   }
  // };

  addPayment = async (req, res, next) => {
  const { id: billId } = req.params; // Get billId from URL params
  const { paymentMode, amountPaid, transactionId } = req.body;
  const createdBy = req.user?.id || req.user?.username || "system";

  const t = await sequelize.transaction();
  try {
    // 🔹 Fetch bill with existing payments
    const bill = await Bill.findByPk(billId, {
      include: { model: Payment, as: "payments" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!bill) throw new Error("Bill not found");
    if (bill.type !== "invoice")
      throw new Error("Payments only apply to invoices");

    // 🔹 Create a new payment entry
    const payment = await Payment.create(
      {
        billId,
        paymentMode,
        amountPaid: parseFloat(amountPaid),
        transactionId,
        createdBy,
      },
      { transaction: t }
    );

    // 🔹 Recalculate total paid
    const totalPaid =
      bill.payments.reduce((sum, p) => sum + p.amountPaid, 0) +
      parseFloat(amountPaid);

    // 🔹 Update bill payment status
    bill.paymentStatus =
      totalPaid >= bill.grandTotal
        ? "paid"
        : totalPaid > 0
        ? "partial"
        : "unpaid";

    await bill.save({ transaction: t });

    // 🔹 Update or create account summary (for customerId or branchId)
    let account = null;
    const accountIdentifier = bill.customerId || bill.branchId;
    
    if (accountIdentifier) {
      // Find account by customerId or branchId
      const whereClause = bill.customerId 
        ? { customerId: bill.customerId }
        : { branchId: bill.branchId };
      
      account = await Account.findOne({
        where: whereClause,
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (account) {
        // Update existing account
        account.totalPaid = (account.totalPaid || 0) + parseFloat(amountPaid);
        account.dueAmount = Math.max(
          (account.totalBilled || 0) - account.totalPaid,
          0
        );
        account.lastPaymentId = payment.id;
        account.status = account.dueAmount > 0 ? "due" : "clear";
        account.updatedBy = createdBy;
        await account.save({ transaction: t });
      } else {
        // Create account if not exists
        account = await Account.create(
          {
            customerId: bill.customerId || null,
            branchId: bill.branchId || null,
            totalBilled: bill.grandTotal,
            totalPaid: parseFloat(amountPaid),
            dueAmount: Math.max(bill.grandTotal - parseFloat(amountPaid), 0),
            lastPaymentId: payment.id,
            status:
              bill.grandTotal - parseFloat(amountPaid) > 0 ? "due" : "clear",
            createdBy: createdBy,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    res.json({
      success: true,
      message: "Payment added successfully",
      paymentStatus: bill.paymentStatus,
      accountSummary: account,
    });
  } catch (error) {
    await t.rollback();
    console.error("💥 Error in addPayment:", error);
    next(error);
  }
};

  /* ──────────────────────────────
     🔹 Get Dashboard Stats
  ───────────────────────────────── */
  getDashboardStats = async (req, res, next) => {
    try {
      const { startDate, endDate, period = "monthly" } = req.query;
      
      // Calculate date range based on period
      let dateStart, dateEnd;
      const now = new Date();
      
      if (period === "today") {
        dateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (period === "weekly") {
        const dayOfWeek = now.getDay();
        dateStart = new Date(now);
        dateStart.setDate(now.getDate() - dayOfWeek);
        dateStart.setHours(0, 0, 0, 0);
        dateEnd = new Date(now);
        dateEnd.setDate(now.getDate() + (6 - dayOfWeek));
        dateEnd.setHours(23, 59, 59, 999);
      } else if (period === "monthly") {
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (startDate && endDate) {
        dateStart = new Date(startDate);
        dateEnd = new Date(endDate);
        dateEnd.setHours(23, 59, 59, 999);
      } else {
        // Default to current month
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }
      
      // Format dates for query
      const startDateStr = dateStart.toISOString().split('T')[0];
      const endDateStr = dateEnd.toISOString().split('T')[0];
      
      // Fetch all invoices in date range with items and products
      const invoices = await Bill.findAll({
        where: {
          type: "invoice",
          billDate: {
            [Op.between]: [startDateStr, endDateStr],
          },
        },
        include: [
          {
            model: BillItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "productName", "purchasePrice"],
              },
            ],
          },
        ],
        order: [["billDate", "ASC"]],
      });
      
      // Calculate totals
      let totalSales = 0;
      let totalCost = 0;
      const salesByDate = {};
      
      invoices.forEach((invoice) => {
        const billDate = invoice.billDate || invoice.createdAt?.toISOString().split('T')[0];
        const sales = parseFloat(invoice.grandTotal) || 0;
        totalSales += sales;
        
        // Initialize date entry if not exists
        if (!salesByDate[billDate]) {
          salesByDate[billDate] = { date: billDate, sales: 0, cost: 0 };
        }
        salesByDate[billDate].sales += sales;
        
        // Calculate cost from items
        if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach((item) => {
            const purchasePrice = parseFloat(item.product?.purchasePrice) || 0;
            const quantity = parseFloat(item.quantity) || 0;
            const itemCost = purchasePrice * quantity;
            totalCost += itemCost;
            salesByDate[billDate].cost += itemCost;
          });
        }
      });
      
      // Calculate profit/loss
      const profit = totalSales - totalCost;
      const profitLoss = profit >= 0 ? profit : 0;
      const loss = profit < 0 ? Math.abs(profit) : 0;
      
      // Convert salesByDate object to array and sort by date
      const graphData = Object.values(salesByDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((item) => ({
          date: item.date,
          sales: parseFloat(item.sales.toFixed(2)),
          cost: parseFloat(item.cost.toFixed(2)),
          profit: parseFloat((item.sales - item.cost).toFixed(2)),
        }));
      
      res.json({
        success: true,
        data: {
          totalSales: parseFloat(totalSales.toFixed(2)),
          totalCost: parseFloat(totalCost.toFixed(2)),
          profit: parseFloat(profitLoss.toFixed(2)),
          loss: parseFloat(loss.toFixed(2)),
          graphData,
          period,
          startDate: startDateStr,
          endDate: endDateStr,
        },
      });
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      next(error);
    }
  };

  /* ──────────────────────────────
     🔹 Get Sales Report
  ───────────────────────────────── */
  getSalesReport = async (req, res, next) => {
    try {
      const { startDate, endDate, branchId, customerId, period } = req.query;
      
      // Calculate date range
      let dateStart, dateEnd;
      const now = new Date();
      
      if (period === "today") {
        dateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (period === "weekly") {
        const dayOfWeek = now.getDay();
        dateStart = new Date(now);
        dateStart.setDate(now.getDate() - dayOfWeek);
        dateStart.setHours(0, 0, 0, 0);
        dateEnd = new Date(now);
        dateEnd.setDate(now.getDate() + (6 - dayOfWeek));
        dateEnd.setHours(23, 59, 59, 999);
      } else if (period === "monthly") {
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (startDate && endDate) {
        dateStart = new Date(startDate);
        dateEnd = new Date(endDate);
        dateEnd.setHours(23, 59, 59, 999);
      } else {
        // Default to current month
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }
      
      const startDateStr = dateStart.toISOString().split('T')[0];
      const endDateStr = dateEnd.toISOString().split('T')[0];
      
      // Build where clause
      const whereClause = {
        type: "invoice",
        billDate: {
          [Op.between]: [startDateStr, endDateStr],
        },
      };
      
      if (branchId) whereClause.branchId = branchId;
      if (customerId) whereClause.customerId = customerId;
      
      // Fetch invoices with items and related data
      const invoices = await Bill.findAll({
        where: whereClause,
        include: [
          {
            model: BillItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "productName", "barCode"],
              },
            ],
          },
          {
            model: Customer,
            as: "customer",
            attributes: ["id", "customer_name", "phone"],
            required: false,
          },
          {
            model: Branch,
            as: "branch",
            attributes: ["id", "branchName"],
            required: false,
          },
        ],
        order: [["billDate", "ASC"]],
      });
      
      // Process data
      let totalSales = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let totalQuantity = 0;
      const salesData = [];
      
      invoices.forEach((invoice) => {
        const invoiceTotal = parseFloat(invoice.grandTotal) || 0;
        const invoiceDiscount = parseFloat(invoice.discountAmount) || 0;
        const invoiceTax = parseFloat(invoice.taxAmount) || 0;
        
        totalSales += invoiceTotal;
        totalDiscount += invoiceDiscount;
        totalTax += invoiceTax;
        
        // Calculate total quantity from items
        let invoiceQty = 0;
        if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach((item) => {
            invoiceQty += parseFloat(item.quantity) || 0;
          });
        }
        totalQuantity += invoiceQty;
        
        salesData.push({
          id: invoice.id,
          date: invoice.billDate,
          invoiceNo: invoice.billNo,
          customer: invoice.customer?.customer_name || "Walk-in",
          branch: invoice.branch?.branchName || "-",
          items: invoice.items?.length || 0,
          quantity: invoiceQty,
          amount: parseFloat(invoice.totalAmount) || 0,
          discount: invoiceDiscount,
          tax: invoiceTax,
          total: invoiceTotal,
          paymentStatus: invoice.paymentStatus,
        });
      });
      
      res.json({
        success: true,
        data: {
          salesData,
          summary: {
            totalSales: parseFloat(totalSales.toFixed(2)),
            totalDiscount: parseFloat(totalDiscount.toFixed(2)),
            totalTax: parseFloat(totalTax.toFixed(2)),
            totalQuantity: parseFloat(totalQuantity.toFixed(2)),
            netRevenue: parseFloat((totalSales - totalDiscount).toFixed(2)),
            totalInvoices: invoices.length,
          },
          period: {
            startDate: startDateStr,
            endDate: endDateStr,
            period: period || "custom",
          },
        },
      });
    } catch (error) {
      console.error("Error in getSalesReport:", error);
      next(error);
    }
  };

  /* ──────────────────────────────
     🔹 Get Profit & Loss Report
  ───────────────────────────────── */
  getProfitLossReport = async (req, res, next) => {
    try {
      const { startDate, endDate, branchId, period } = req.query;
      
      // Calculate date range
      let dateStart, dateEnd;
      const now = new Date();
      
      if (period === "today") {
        dateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (period === "weekly") {
        const dayOfWeek = now.getDay();
        dateStart = new Date(now);
        dateStart.setDate(now.getDate() - dayOfWeek);
        dateStart.setHours(0, 0, 0, 0);
        dateEnd = new Date(now);
        dateEnd.setDate(now.getDate() + (6 - dayOfWeek));
        dateEnd.setHours(23, 59, 59, 999);
      } else if (period === "monthly") {
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (startDate && endDate) {
        dateStart = new Date(startDate);
        dateEnd = new Date(endDate);
        dateEnd.setHours(23, 59, 59, 999);
      } else {
        // Default to current month
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }
      
      const startDateStr = dateStart.toISOString().split('T')[0];
      const endDateStr = dateEnd.toISOString().split('T')[0];
      
      // Build where clause
      const whereClause = {
        type: "invoice",
        billDate: {
          [Op.between]: [startDateStr, endDateStr],
        },
      };
      
      if (branchId) whereClause.branchId = branchId;
      
      // Fetch invoices with items and products
      const invoices = await Bill.findAll({
        where: whereClause,
        include: [
          {
            model: BillItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "productName", "purchasePrice"],
              },
            ],
          },
        ],
        order: [["billDate", "ASC"]],
      });
      
      // Calculate revenue and cost
      let totalRevenue = 0;
      let totalCost = 0;
      const profitLossData = [];
      const salesByDate = {};
      
      invoices.forEach((invoice) => {
        const billDate = invoice.billDate || invoice.createdAt?.toISOString().split('T')[0];
        const revenue = parseFloat(invoice.grandTotal) || 0;
        totalRevenue += revenue;
        
        // Calculate cost from items
        let invoiceCost = 0;
        if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach((item) => {
            const purchasePrice = parseFloat(item.product?.purchasePrice) || 0;
            const quantity = parseFloat(item.quantity) || 0;
            invoiceCost += purchasePrice * quantity;
          });
        }
        totalCost += invoiceCost;
        
        // Group by date
        if (!salesByDate[billDate]) {
          salesByDate[billDate] = { date: billDate, revenue: 0, cost: 0 };
        }
        salesByDate[billDate].revenue += revenue;
        salesByDate[billDate].cost += invoiceCost;
        
        profitLossData.push({
          id: invoice.id,
          date: billDate,
          invoiceNo: invoice.billNo,
          revenue: parseFloat(revenue.toFixed(2)),
          cost: parseFloat(invoiceCost.toFixed(2)),
          profit: parseFloat((revenue - invoiceCost).toFixed(2)),
          margin: revenue > 0 ? parseFloat((((revenue - invoiceCost) / revenue) * 100).toFixed(2)) : 0,
        });
      });
      
      // Convert salesByDate to array
      const graphData = Object.values(salesByDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((item) => ({
          date: item.date,
          revenue: parseFloat(item.revenue.toFixed(2)),
          cost: parseFloat(item.cost.toFixed(2)),
          profit: parseFloat((item.revenue - item.cost).toFixed(2)),
        }));
      
      const grossProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;
      
      res.json({
        success: true,
        data: {
          profitLossData,
          graphData,
          summary: {
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(2)),
            grossProfit: parseFloat(grossProfit.toFixed(2)),
            netProfit: parseFloat(grossProfit.toFixed(2)),
            profitMargin: parseFloat(profitMargin.toFixed(2)),
            totalInvoices: invoices.length,
          },
          period: {
            startDate: startDateStr,
            endDate: endDateStr,
            period: period || "custom",
          },
        },
      });
    } catch (error) {
      console.error("Error in getProfitLossReport:", error);
      next(error);
    }
  };

  /* ──────────────────────────────
     🔹 Get Payment Collection Report
  ───────────────────────────────── */
  getPaymentCollectionReport = async (req, res, next) => {
    try {
      const { startDate, endDate, paymentMode, period } = req.query;
      
      // Calculate date range
      let dateStart, dateEnd;
      const now = new Date();
      
      if (period === "today") {
        dateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (period === "weekly") {
        const dayOfWeek = now.getDay();
        dateStart = new Date(now);
        dateStart.setDate(now.getDate() - dayOfWeek);
        dateStart.setHours(0, 0, 0, 0);
        dateEnd = new Date(now);
        dateEnd.setDate(now.getDate() + (6 - dayOfWeek));
        dateEnd.setHours(23, 59, 59, 999);
      } else if (period === "monthly") {
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (startDate && endDate) {
        dateStart = new Date(startDate);
        dateEnd = new Date(endDate);
        dateEnd.setHours(23, 59, 59, 999);
      } else {
        // Default to current month
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }
      
      const startDateStr = dateStart.toISOString().split('T')[0];
      const endDateStr = dateEnd.toISOString().split('T')[0];
      
      // Build where clause for payments
      const paymentWhereClause = {
        paymentDate: {
          [Op.between]: [dateStart, dateEnd],
        },
      };
      
      if (paymentMode) paymentWhereClause.paymentMode = paymentMode;
      
      // Fetch payments with bills and customers
      const payments = await Payment.findAll({
        where: paymentWhereClause,
        include: [
          {
            model: Bill,
            as: "bill",
            attributes: ["id", "billNo", "billDate"],
            include: [
              {
                model: Customer,
                as: "customer",
                attributes: ["id", "customer_name", "phone"],
                required: false,
              },
            ],
          },
        ],
        order: [["paymentDate", "DESC"]],
      });
      
      // Process data
      let totalCollected = 0;
      const paymentModeBreakdown = {
        cash: 0,
        upi: 0,
        card: 0,
        bank: 0,
      };
      const collectionData = [];
      const collectionByDate = {};
      
      payments.forEach((payment) => {
        const amount = parseFloat(payment.amountPaid) || 0;
        totalCollected += amount;
        
        // Update payment mode breakdown
        const mode = payment.paymentMode || "cash";
        if (paymentModeBreakdown[mode] !== undefined) {
          paymentModeBreakdown[mode] += amount;
        }
        
        // Group by date
        const paymentDate = payment.paymentDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
        if (!collectionByDate[paymentDate]) {
          collectionByDate[paymentDate] = 0;
        }
        collectionByDate[paymentDate] += amount;
        
        collectionData.push({
          id: payment.id,
          date: paymentDate,
          invoiceNo: payment.bill?.billNo || "-",
          customer: payment.bill?.customer?.customer_name || "Walk-in",
          paymentMode: mode,
          amount: parseFloat(amount.toFixed(2)),
          transactionId: payment.transactionId || "-",
        });
      });
      
      // Convert collectionByDate to array for graph
      const graphData = Object.entries(collectionByDate)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([date, amount]) => ({
          date,
          amount: parseFloat(amount.toFixed(2)),
        }));
      
      res.json({
        success: true,
        data: {
          collectionData,
          graphData,
          summary: {
            totalCollected: parseFloat(totalCollected.toFixed(2)),
            paymentModeBreakdown: {
              cash: parseFloat(paymentModeBreakdown.cash.toFixed(2)),
              upi: parseFloat(paymentModeBreakdown.upi.toFixed(2)),
              card: parseFloat(paymentModeBreakdown.card.toFixed(2)),
              bank: parseFloat(paymentModeBreakdown.bank.toFixed(2)),
            },
            totalPayments: payments.length,
          },
          period: {
            startDate: startDateStr,
            endDate: endDateStr,
            period: period || "custom",
          },
        },
      });
    } catch (error) {
      console.error("Error in getPaymentCollectionReport:", error);
      next(error);
    }
  };
}

export const BillController = new BillControllerClass();
