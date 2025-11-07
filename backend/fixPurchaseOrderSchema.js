import sequelize from "./src/config/db.js";
import dotenv from "dotenv";

dotenv.config();

const fixPurchaseOrderSchema = async () => {
  try {
    console.log("🔵 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("🔵 Fixing purchase_order table schema...");
    
    // First, check the current column types
    const [columnInfo] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'purchase_order' 
      AND COLUMN_NAME IN ('addressId', 'shippingAddressId')
    `);
    
    console.log("📋 Current column info:", columnInfo);
    
    // Check address table id type
    const [addressInfo] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'address' 
      AND COLUMN_NAME = 'id'
    `);
    
    console.log("📋 Address table id type:", addressInfo);
    
    // Find and drop foreign key constraints first
    console.log("🔵 Finding foreign key constraints...");
    const [fkConstraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'purchase_order' 
      AND COLUMN_NAME IN ('addressId', 'shippingAddressId')
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log("📋 Found foreign key constraints:", fkConstraints);
    
    // Drop foreign key constraints
    console.log("🔵 Dropping foreign key constraints...");
    for (const fk of fkConstraints) {
      try {
        await sequelize.query(`ALTER TABLE \`purchase_order\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
        console.log(`✅ Dropped foreign key: ${fk.CONSTRAINT_NAME}`);
      } catch (e) {
        console.log(`⚠️ Could not drop foreign key ${fk.CONSTRAINT_NAME}:`, e.message);
      }
    }
    
    // Get the correct data type from address table (likely VARCHAR(36) or CHAR(36))
    const addressIdType = addressInfo[0]?.COLUMN_TYPE || 'VARCHAR(36)';
    console.log(`🔵 Using data type: ${addressIdType} for addressId columns`);
    
    // Alter the table to add default NULL values with correct type
    await sequelize.query(`
      ALTER TABLE \`purchase_order\` 
      MODIFY COLUMN \`addressId\` ${addressIdType} NULL DEFAULT NULL,
      MODIFY COLUMN \`shippingAddressId\` ${addressIdType} NULL DEFAULT NULL
    `);
    
    // Recreate foreign key constraints
    console.log("🔵 Recreating foreign key constraints...");
    try {
      await sequelize.query(`
        ALTER TABLE \`purchase_order\` 
        ADD CONSTRAINT \`fk_purchase_order_addressId\` 
        FOREIGN KEY (\`addressId\`) REFERENCES \`address\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log("✅ Recreated addressId foreign key");
    } catch (e) {
      console.log("⚠️ Could not recreate addressId foreign key:", e.message);
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE \`purchase_order\` 
        ADD CONSTRAINT \`fk_purchase_order_shippingAddressId\` 
        FOREIGN KEY (\`shippingAddressId\`) REFERENCES \`address\`(\`id\`) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log("✅ Recreated shippingAddressId foreign key");
    } catch (e) {
      console.log("⚠️ Could not recreate shippingAddressId foreign key:", e.message);
    }

    console.log("✅ Successfully updated purchase_order table schema");
    console.log("✅ addressId and shippingAddressId now allow NULL with default NULL");

    // Verify the changes
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'purchase_order' 
      AND COLUMN_NAME IN ('addressId', 'shippingAddressId')
    `);

    console.log("\n📋 Verification - Column details:");
    results.forEach(row => {
      console.log(`  - ${row.COLUMN_NAME}: NULLABLE=${row.IS_NULLABLE}, DEFAULT=${row.COLUMN_DEFAULT || 'NULL'}`);
    });

    console.log("\n✅ Schema fix completed successfully!");
    console.log("✅ You can now create purchase orders without addressId and shippingAddressId");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing purchase_order schema:", error.message);
    console.error("Error details:", error);
    process.exit(1);
  }
};

fixPurchaseOrderSchema();

