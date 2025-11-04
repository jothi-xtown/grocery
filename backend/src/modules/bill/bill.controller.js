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
import Payment from "./payment.model.js";
import Customer from "../customer/customer.model.js";
import Account from "../accounts/accounts.model.js";
import { generateBillNumber } from "../../shared/utils/generateBillNumber.js";
import sequelize from "../../config/db.js";

const BillCrud = new BaseCrud(Bill);

class BillControllerClass extends BaseController {
  constructor() {
    super(BillCrud, "Bill");
  }

  /* ──────────────────────────────
     🔹 Create Bill (Quotation / Invoice)
  ───────────────────────────────── */
  create = async (req, res, next) => {
    const { type, customerId, items, remarks } = req.body;
    const createdBy = req.user?.id;

    if (!items || !items.length)
      return res.status(400).json({ message: "Items are required" });

    const t = await sequelize.transaction();
    try {
      const billNo = await generateBillNumber(type);

      const bill = await Bill.create(
        { billNo, type, customerId, remarks, createdBy },
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
          const product = await Product.findByPk(productId);
          if (!product || product.stock < quantity)
            throw new Error(
              `Insufficient stock for ${product?.name || productId}`
            );
          product.stock -= quantity;
          await product.save({ transaction: t });
        }
      }

      bill.totalAmount = total;
      bill.grandTotal = total;
      await bill.save({ transaction: t });

      // ✅ Update Account if invoice
      if (type === "invoice") {
        let account = await Account.findOne({ where: { customerId } });
        if (!account) {
          account = await Account.create({
            customerId,
            totalBilled: total,
            dueAmount: total,
            lastBillId: bill.id,
          });
        } else {
          account.totalBilled += total;
          account.dueAmount += total;
          account.lastBillId = bill.id;
          account.status = account.dueAmount > 0 ? "due" : "clear";
          await account.save({ transaction: t });
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
      const bills = await Bill.findAll({
        include: [
          { model: Customer, as: "customer" },
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
    const { items, remarks, customerId, type } = req.body;
    const updatedBy = req.user?.id;

    const t = await sequelize.transaction();
    try {
      const bill = await Bill.findByPk(id, { include: { model: BillItem, as: "items" } });
      if (!bill) throw new Error("Bill not found");

      bill.customerId = customerId || bill.customerId;
      bill.remarks = remarks || bill.remarks;
      bill.type = type || bill.type;
      bill.updatedBy = updatedBy;
      await bill.save({ transaction: t });

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
        const product = await Product.findByPk(item.productId);
        if (!product || product.stock < item.quantity)
          throw new Error(`Insufficient stock for ${product?.name}`);
        product.stock -= item.quantity;
        await product.save({ transaction: t });
      }

      await quotation.save({ transaction: t });
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
  const { billId, paymentMode, amountPaid, transactionId } = req.body;
  const createdBy = req.user?.id;

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

    // 🔹 Update or create account summary
    let account = await Account.findOne({
      where: { customerId: bill.customerId },
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
      await account.save({ transaction: t });
    } else {
      // Create account if not exists
      account = await Account.create(
        {
          customerId: bill.customerId,
          totalBilled: bill.grandTotal,
          totalPaid: parseFloat(amountPaid),
          dueAmount: Math.max(bill.grandTotal - parseFloat(amountPaid), 0),
          lastPaymentId: payment.id,
          status:
            bill.grandTotal - parseFloat(amountPaid) > 0 ? "due" : "clear",
        },
        { transaction: t }
      );
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


}

export const BillController = new BillControllerClass();
