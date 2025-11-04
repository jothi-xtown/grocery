import Account from "./account.model.js";
import Bill from "../bill/bill.model.js";
import Payment from "../bill/payment.model.js";
import Customer from "../customer/customer.model.js";

export const getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.findAll({
      include: [
        { model: Customer, as: "customer" },
        {
          model: Bill,
          as: "lastBill",
          attributes: ["billNo", "totalAmount", "createdAt"],
        },
      ],
    });

    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
};

export const getAccountByCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const account = await Account.findOne({
      where: { customerId },
      include: [
        { model: Customer, as: "customer" },
        {
          model: Bill,
          as: "lastBill",
          attributes: ["billNo", "totalAmount", "createdAt"],
        },
        {
          model: Payment,
          as: "payments",
          attributes: ["amountPaid", "paymentMode", "createdAt"],
        },
      ],
    });

    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};
