import Bill from "../../modules/bill/bill.model.js";

export const generateBillNumber = async (type) => {
  const prefix = type === "quotation" ? "QUO" : "INV";
  const last = await Bill.findOne({
    where: { type },
    order: [["createdAt", "DESC"]],
  });

  const next = last ? parseInt(last.billNo.split("-")[1]) + 1 : 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
};
