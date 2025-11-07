import dotenv from "dotenv";
import sequelize from "./src/config/db.js";
import Bill from "./src/modules/bill/bill.model.js";

dotenv.config();

const fixBillsCustomerIdNullable = async () => {
  try {
    console.log("🔵 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("🔵 Checking customerId column in bills table...");
    
    // Check current column definition
    const [columnInfo] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bills' 
      AND COLUMN_NAME = 'customerId'
    `);

    if (columnInfo.length === 0) {
      throw new Error("customerId column not found in bills table");
    }

    const currentColumn = columnInfo[0];
    console.log("📋 Current customerId column info:", currentColumn);

    if (currentColumn.IS_NULLABLE === 'NO') {
      console.log("⚠️ customerId is currently NOT NULL, modifying to allow NULL...");
      
      // Check if there are any foreign key constraints
      const [fkConstraints] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bills' 
        AND COLUMN_NAME = 'customerId'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);

      // Drop foreign key constraint if it exists (we'll recreate it)
      if (fkConstraints.length > 0) {
        for (const fk of fkConstraints) {
          console.log(`🔵 Dropping foreign key constraint: ${fk.CONSTRAINT_NAME}`);
          try {
            await sequelize.query(`
              ALTER TABLE \`bills\` 
              DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`
            `);
            console.log(`✅ Dropped foreign key: ${fk.CONSTRAINT_NAME}`);
          } catch (e) {
            console.log(`⚠️ Could not drop foreign key ${fk.CONSTRAINT_NAME}:`, e.message);
          }
        }
      }

      // Modify column to allow NULL
      console.log("🔵 Modifying customerId column to allow NULL...");
      await sequelize.query(`
        ALTER TABLE \`bills\` 
        MODIFY COLUMN \`customerId\` ${currentColumn.COLUMN_TYPE} NULL
      `);
      console.log("✅ customerId column now allows NULL");

      // Recreate foreign key constraint if it existed
      if (fkConstraints.length > 0) {
        console.log("🔵 Checking customers.id column type and collation...");
        
        // Check customers.id column type and collation
        const [customerIdInfo] = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'customers' 
          AND COLUMN_NAME = 'id'
        `);
        
        // Check bills.customerId column type and collation
        const [billsCustomerIdInfo] = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'bills' 
          AND COLUMN_NAME = 'customerId'
        `);
        
        console.log("📋 Customers.id column:", customerIdInfo[0]);
        console.log("📋 Bills.customerId column:", billsCustomerIdInfo[0]);
        
        // If collations don't match, modify the bills.customerId column to match customers.id
        if (customerIdInfo[0].COLLATION_NAME !== billsCustomerIdInfo[0].COLLATION_NAME) {
          console.log("⚠️ Collations don't match, modifying bills.customerId to match customers.id...");
          const columnType = customerIdInfo[0].COLUMN_TYPE;
          const collation = customerIdInfo[0].COLLATION_NAME;
          await sequelize.query(`
            ALTER TABLE \`bills\` 
            MODIFY COLUMN \`customerId\` ${columnType} CHARACTER SET ${customerIdInfo[0].CHARACTER_SET_NAME} COLLATE ${collation} NULL
          `);
          console.log("✅ bills.customerId column collation updated to match customers.id");
        }
        
        console.log("🔵 Recreating foreign key constraint...");
        await sequelize.query(`
          ALTER TABLE \`bills\` 
          ADD CONSTRAINT \`bills_customerId_fkey\` 
          FOREIGN KEY (\`customerId\`) 
          REFERENCES \`customers\`(\`id\`) 
          ON DELETE SET NULL 
          ON UPDATE CASCADE
        `);
        console.log("✅ Foreign key constraint recreated");
      }

      // Verify the change
      const [verifyColumn] = await sequelize.query(`
        SELECT COLUMN_NAME, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bills' 
        AND COLUMN_NAME = 'customerId'
      `);
      console.log("📋 Verified customerId column:", verifyColumn[0]);
      console.log("✅ customerId is now nullable:", verifyColumn[0].IS_NULLABLE === 'YES');
    } else {
      console.log("✅ customerId column already allows NULL");
    }

    console.log("\n✅ Bills table updated successfully!");
    console.log("✅ customerId column now allows NULL values");

  } catch (error) {
    console.error("❌ Error updating customerId column:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

fixBillsCustomerIdNullable();

