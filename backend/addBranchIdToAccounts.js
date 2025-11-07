import dotenv from "dotenv";
import sequelize from "./src/config/db.js";
import Account from "./src/modules/accounts/accounts.model.js";
import Branch from "./src/modules/branch/branch.model.js";

dotenv.config();

const addBranchIdToAccounts = async () => {
  try {
    console.log("🔵 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("🔵 Checking if branchId column exists in accounts table...");
    
    // Check if column exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'accounts' 
      AND COLUMN_NAME = 'branchId'
    `);

    if (columns.length > 0) {
      console.log("✅ branchId column already exists in accounts table");
      console.log("🔵 Verifying column properties...");
      
      const [columnInfo] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'accounts' 
        AND COLUMN_NAME = 'branchId'
      `);
      
      console.log("📋 branchId column info:", columnInfo[0]);
      
      // Check if foreign key exists
      const [fkConstraints] = await sequelize.query(`
        SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'accounts' 
        AND COLUMN_NAME = 'branchId'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      if (fkConstraints.length > 0) {
        console.log("✅ Foreign key constraint already exists:", fkConstraints[0].CONSTRAINT_NAME);
      } else {
        console.log("⚠️ Foreign key constraint missing, checking column types...");
        
        // Check branch.id column type
        const [branchIdInfo] = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'branch' 
          AND COLUMN_NAME = 'id'
        `);
        
        // Check accounts.branchId column type
        const [accountsBranchIdInfo] = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'accounts' 
          AND COLUMN_NAME = 'branchId'
        `);
        
        console.log("📋 Branch.id column:", branchIdInfo[0]);
        console.log("📋 Accounts.branchId column:", accountsBranchIdInfo[0]);
        
        // If collations don't match, modify the accounts.branchId column to match branch.id
        if (branchIdInfo[0].COLLATION_NAME !== accountsBranchIdInfo[0].COLLATION_NAME) {
          console.log("⚠️ Collations don't match, modifying accounts.branchId to match branch.id...");
          const columnType = branchIdInfo[0].COLUMN_TYPE;
          const collation = branchIdInfo[0].COLLATION_NAME;
          await sequelize.query(`
            ALTER TABLE \`accounts\` 
            MODIFY COLUMN \`branchId\` ${columnType} CHARACTER SET ${branchIdInfo[0].CHARACTER_SET_NAME} COLLATE ${collation} NULL
          `);
          console.log("✅ accounts.branchId column collation updated to match branch.id");
        }
        
        console.log("🔵 Adding foreign key constraint...");
        await sequelize.query(`
          ALTER TABLE \`accounts\` 
          ADD CONSTRAINT \`accounts_branchId_fkey\` 
          FOREIGN KEY (\`branchId\`) 
          REFERENCES \`branch\`(\`id\`) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE
        `);
        console.log("✅ Foreign key constraint added");
      }
    } else {
      console.log("🔵 Checking branch table structure...");
      
      // First, check what type the branch.id column is
      const [branchColumns] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'branch' 
        AND COLUMN_NAME = 'id'
      `);
      
      if (branchColumns.length === 0) {
        throw new Error("Branch table or id column not found. Please ensure branch table exists.");
      }
      
      const branchIdType = branchColumns[0].COLUMN_TYPE;
      const branchCollation = branchColumns[0].COLLATION_NAME;
      const branchCharset = branchColumns[0].CHARACTER_SET_NAME;
      console.log("📋 Branch id column type:", branchIdType);
      console.log("📋 Branch id collation:", branchCollation);
      
      // First, ensure branch table exists
      await Branch.sync({ alter: false });
      console.log("✅ Branch table verified");
      
      console.log("🔵 Adding branchId column to accounts table with type:", branchIdType);
      
      // Add the column with the same type as branch.id
      await sequelize.query(`
        ALTER TABLE \`accounts\` 
        ADD COLUMN \`branchId\` ${branchIdType} CHARACTER SET ${branchCharset} COLLATE ${branchCollation} NULL 
        AFTER \`customerId\`
      `);
      console.log("✅ branchId column added");
      
      // Add foreign key constraint
      console.log("🔵 Adding foreign key constraint...");
      await sequelize.query(`
        ALTER TABLE \`accounts\` 
        ADD CONSTRAINT \`accounts_branchId_fkey\` 
        FOREIGN KEY (\`branchId\`) 
        REFERENCES \`branch\`(\`id\`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
      `);
      console.log("✅ Foreign key constraint added");
      
      // Verify the column was added
      const [verifyColumns] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'accounts' 
        AND COLUMN_NAME = 'branchId'
      `);
      console.log("📋 Verified branchId column:", verifyColumns[0]);
    }

    // Also check if customerId needs to be nullable
    const [customerIdInfo] = await sequelize.query(`
      SELECT COLUMN_NAME, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'accounts' 
      AND COLUMN_NAME = 'customerId'
    `);
    
    if (customerIdInfo.length > 0 && customerIdInfo[0].IS_NULLABLE === 'NO') {
      console.log("⚠️ customerId is NOT NULL, modifying to allow NULL...");
      
      // Check for foreign key constraints
      const [fkConstraints] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'accounts' 
        AND COLUMN_NAME = 'customerId'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);

      // Drop foreign key constraint if it exists (we'll recreate it)
      if (fkConstraints.length > 0) {
        for (const fk of fkConstraints) {
          console.log(`🔵 Dropping foreign key constraint: ${fk.CONSTRAINT_NAME}`);
          try {
            await sequelize.query(`
              ALTER TABLE \`accounts\` 
              DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`
            `);
            console.log(`✅ Dropped foreign key: ${fk.CONSTRAINT_NAME}`);
          } catch (e) {
            console.log(`⚠️ Could not drop foreign key ${fk.CONSTRAINT_NAME}:`, e.message);
          }
        }
      }

      // Get customerId column type
      const [customerIdTypeInfo] = await sequelize.query(`
        SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'accounts' 
        AND COLUMN_NAME = 'customerId'
      `);

      // Modify column to allow NULL
      console.log("🔵 Modifying customerId column to allow NULL...");
      await sequelize.query(`
        ALTER TABLE \`accounts\` 
        MODIFY COLUMN \`customerId\` ${customerIdTypeInfo[0].COLUMN_TYPE} CHARACTER SET ${customerIdTypeInfo[0].CHARACTER_SET_NAME} COLLATE ${customerIdTypeInfo[0].COLLATION_NAME} NULL
      `);
      console.log("✅ customerId column now allows NULL");

      // Recreate foreign key constraint if it existed
      if (fkConstraints.length > 0) {
        console.log("🔵 Recreating foreign key constraint...");
        await sequelize.query(`
          ALTER TABLE \`accounts\` 
          ADD CONSTRAINT \`accounts_customerId_fkey\` 
          FOREIGN KEY (\`customerId\`) 
          REFERENCES \`customers\`(\`id\`) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE
        `);
        console.log("✅ Foreign key constraint recreated");
      }
    } else {
      console.log("✅ customerId column already allows NULL");
    }

    console.log("\n✅ Accounts table updated successfully!");
    console.log("✅ branchId column is now available in the accounts table");
    console.log("✅ customerId column allows NULL values");

  } catch (error) {
    console.error("❌ Error adding branchId to accounts table:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

addBranchIdToAccounts();

