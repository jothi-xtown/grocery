import dotenv from "dotenv";
import sequelize from "./src/config/db.js";
import { PurchaseOrder, POItem } from "./src/modules/purchaseOrder/purchaseOrder.model.js";
import Address from "./src/modules/address/address.model.js";
import Supplier from "./src/modules/supplier/supplier.model.js";
import Product from "./src/modules/product/product.model.js";
import Unit from "./src/modules/unit/unit.model.js";

dotenv.config();

const recreatePurchaseOrderTable = async () => {
  try {
    console.log("🔵 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("⚠️  WARNING: This will DELETE all purchase order data!");
    console.log("🔵 Dropping purchase_order and po_item tables...");

    // Find and drop foreign key constraints related to purchase_order and po_item
    console.log("🔵 Finding and dropping foreign key constraints...");
    const [fkConstraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND (REFERENCED_TABLE_NAME = 'purchase_order' OR TABLE_NAME = 'purchase_order' OR TABLE_NAME = 'po_item')
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const fk of fkConstraints) {
      try {
        await sequelize.query(`ALTER TABLE \`${fk.TABLE_NAME}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
        console.log(`✅ Dropped foreign key: ${fk.CONSTRAINT_NAME} from ${fk.TABLE_NAME}`);
      } catch (e) {
        console.log(`⚠️ Could not drop foreign key ${fk.CONSTRAINT_NAME} from ${fk.TABLE_NAME} (may not exist or already dropped):`, e.message);
      }
    }

    // Drop po_item table first as it depends on purchase_order
    console.log("🔵 Dropping po_item table...");
    try {
      await POItem.drop({ force: true });
      console.log("✅ Dropped po_item table");
    } catch (e) {
      console.log("⚠️ Could not drop po_item table (may not exist):", e.message);
    }

    // Drop purchase_order table
    console.log("🔵 Dropping purchase_order table...");
    try {
      await PurchaseOrder.drop({ force: true });
      console.log("✅ Dropped purchase_order table");
    } catch (e) {
      console.log("⚠️ Could not drop purchase_order table (may not exist):", e.message);
    }

    console.log("🔵 Recreating tables with correct schema...");
    // Ensure all related tables are synced first
    await Address.sync({ alter: false });
    await Supplier.sync({ alter: false });
    await Product.sync({ alter: false });
    await Unit.sync({ alter: false });

    // Recreate PurchaseOrder table
    await PurchaseOrder.sync({ force: true });
    console.log("✅ Created purchase_order table");
    
    // Recreate POItem table
    await POItem.sync({ force: true });
    console.log("✅ Created po_item table");

    console.log("\n📋 Verifying schema...");
    const [verifiedColumnInfo] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'purchase_order' 
      AND COLUMN_NAME IN ('orderNumber', 'orderDate', 'supplierId', 'addressId', 'shippingAddressId', 'gstInclude', 'gstPercent', 'status', 'notes')
    `);
    console.log("📋 Purchase Order table columns:");
    verifiedColumnInfo.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: TYPE=${col.DATA_TYPE}, NULLABLE=${col.IS_NULLABLE}, DEFAULT=${col.COLUMN_DEFAULT || 'NULL'}`);
    });

    const [poItemColumns] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'po_item' 
      AND COLUMN_NAME IN ('purchaseOrderId', 'productId', 'unitPrice', 'unitQuantity', 'totalQuantity', 'total')
    `);
    console.log("\n📋 PO Item table columns:");
    poItemColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: TYPE=${col.DATA_TYPE}, NULLABLE=${col.IS_NULLABLE}, DEFAULT=${col.COLUMN_DEFAULT || 'NULL'}`);
    });

    console.log("\n✅ Purchase order tables recreated successfully!");
    console.log("✅ Tables now have correct schema matching model definitions");
    console.log("⚠️  Note: All existing purchase order data has been deleted");

  } catch (error) {
    console.error("❌ Error recreating purchase order tables:", error);
    console.error("Error details:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

recreatePurchaseOrderTable();

