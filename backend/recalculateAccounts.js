import dotenv from "dotenv";
import sequelize from "./src/config/db.js";
import Account from "./src/modules/accounts/accounts.model.js";
import Bill from "./src/modules/bill/bill.model.js";
import Payment from "./src/modules/bill/payment.model.js";

// Ensure associations are loaded
import "./src/modules/bill/bill.model.js";
import "./src/modules/bill/payment.model.js";

dotenv.config();

const recalculateAccounts = async () => {
  try {
    console.log("🔵 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("🔵 Fetching all invoices...");
    const invoices = await Bill.findAll({
      where: { type: "invoice" },
      include: [
        {
          model: Payment,
          as: "payments",
          required: false,
        },
      ],
    });

    console.log(`📋 Found ${invoices.length} invoices`);

    // Group invoices by customerId or branchId
    const accountMap = new Map();

    for (const invoice of invoices) {
      const identifier = invoice.customerId || invoice.branchId;
      if (!identifier) {
        console.log(`⚠️ Invoice ${invoice.billNo} has no customerId or branchId, skipping`);
        continue;
      }

      const key = invoice.customerId ? `customer:${invoice.customerId}` : `branch:${invoice.branchId}`;
      
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          customerId: invoice.customerId || null,
          branchId: invoice.branchId || null,
          invoices: [],
          totalBilled: 0,
          totalPaid: 0,
        });
      }

      const accountData = accountMap.get(key);
      accountData.invoices.push(invoice);
      accountData.totalBilled += parseFloat(invoice.grandTotal || 0);
      
      // Calculate total paid from payments
      const invoicePayments = invoice.payments || [];
      const invoicePaid = invoicePayments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
      accountData.totalPaid += invoicePaid;
    }

    console.log(`📋 Found ${accountMap.size} unique accounts to update`);

    // Update or create accounts
    for (const [key, accountData] of accountMap.entries()) {
      const whereClause = accountData.customerId 
        ? { customerId: accountData.customerId }
        : { branchId: accountData.branchId };

      let account = await Account.findOne({ where: whereClause });

      const dueAmount = Math.max(accountData.totalBilled - accountData.totalPaid, 0);
      const status = dueAmount > 0 ? "due" : "clear";

      // Find the most recent invoice for lastBillId
      const lastInvoice = accountData.invoices.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )[0];

      if (account) {
        console.log(`📝 Updating account for ${accountData.customerId ? 'customer' : 'branch'} ${accountData.customerId || accountData.branchId}`);
        account.totalBilled = accountData.totalBilled;
        account.totalPaid = accountData.totalPaid;
        account.dueAmount = dueAmount;
        account.status = status;
        account.lastBillId = lastInvoice?.id || account.lastBillId;
        await account.save();
        console.log(`✅ Updated account: ${account.id}`);
      } else {
        console.log(`📝 Creating account for ${accountData.customerId ? 'customer' : 'branch'} ${accountData.customerId || accountData.branchId}`);
        account = await Account.create({
          customerId: accountData.customerId || null,
          branchId: accountData.branchId || null,
          totalBilled: accountData.totalBilled,
          totalPaid: accountData.totalPaid,
          dueAmount: dueAmount,
          status: status,
          lastBillId: lastInvoice?.id || null,
          createdBy: "system",
        });
        console.log(`✅ Created account: ${account.id}`);
      }
    }

    // Find accounts that don't have any invoices (orphaned accounts)
    console.log("\n🔵 Checking for orphaned accounts...");
    const allAccounts = await Account.findAll();
    let orphanedCount = 0;

    for (const account of allAccounts) {
      const whereClause = account.customerId 
        ? { customerId: account.customerId, type: "invoice" }
        : { branchId: account.branchId, type: "invoice" };
      
      const hasInvoices = await Bill.count({ where: whereClause });
      
      if (hasInvoices === 0) {
        console.log(`⚠️ Found orphaned account: ${account.id} (${account.customerId ? 'customer' : 'branch'})`);
        // Reset orphaned accounts to zero (they have no invoices)
        account.totalBilled = 0;
        account.totalPaid = 0;
        account.dueAmount = 0;
        account.status = "clear";
        account.lastBillId = null;
        await account.save();
        console.log(`✅ Reset orphaned account: ${account.id}`);
        orphanedCount++;
      }
    }

    console.log(`\n✅ Account recalculation complete!`);
    console.log(`📊 Updated/Created ${accountMap.size} accounts`);
    console.log(`⚠️ Found ${orphanedCount} orphaned accounts`);

  } catch (error) {
    console.error("❌ Error recalculating accounts:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

recalculateAccounts();

