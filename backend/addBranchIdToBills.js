import dotenv from "dotenv";
import sequelize from "./src/config/db.js";
import Bill from "./src/modules/bill/bill.model.js";
import Branch from "./src/modules/branch/branch.model.js";

dotenv.config();

const addBranchIdToBills = async () => {
  try {
    console.log("🔵 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("🔵 Checking if branchId column exists in bills table...");
    
    // Check if column exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bills' 
      AND COLUMN_NAME = 'branchId'
    `);

    if (columns.length > 0) {
      console.log("✅ branchId column already exists in bills table");
      console.log("🔵 Verifying column properties...");
      
      const [columnInfo] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bills' 
        AND COLUMN_NAME = 'branchId'
      `);
      
      console.log("📋 branchId column info:", columnInfo[0]);
      
      // Check if foreign key exists
      const [fkConstraints] = await sequelize.query(`
        SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bills' 
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
        
        // Check bills.branchId column type
        const [billsBranchIdInfo] = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'bills' 
          AND COLUMN_NAME = 'branchId'
        `);
        
        console.log("📋 Branch.id column:", branchIdInfo[0]);
        console.log("📋 Bills.branchId column:", billsBranchIdInfo[0]);
        
        // If types or collations don't match, modify the bills.branchId column to match branch.id
        const typesMatch = branchIdInfo[0].COLUMN_TYPE === billsBranchIdInfo[0].COLUMN_TYPE;
        const collationsMatch = branchIdInfo[0].COLLATION_NAME === billsBranchIdInfo[0].COLLATION_NAME;
        
        if (!typesMatch || !collationsMatch) {
          console.log("⚠️ Column types or collations don't match, modifying bills.branchId to match branch.id...");
          const columnType = branchIdInfo[0].COLUMN_TYPE;
          const collation = branchIdInfo[0].COLLATION_NAME;
          await sequelize.query(`
            ALTER TABLE \`bills\` 
            MODIFY COLUMN \`branchId\` ${columnType} CHARACTER SET ${branchIdInfo[0].CHARACTER_SET_NAME} COLLATE ${collation} NULL
          `);
          console.log("✅ bills.branchId column type and collation updated to match branch.id");
        }
        
        console.log("🔵 Adding foreign key constraint...");
        await sequelize.query(`
          ALTER TABLE \`bills\` 
          ADD CONSTRAINT \`bills_branchId_fkey\` 
          FOREIGN KEY (\`branchId\`) 
          REFERENCES \`branch\`(\`id\`) 
          ON DELETE SET NULL 
          ON UPDATE CASCADE
        `);
        console.log("✅ Foreign key constraint added");
      }
    } else {
      console.log("🔵 Checking branch table structure...");
      
      // First, check what type the branch.id column is
      const [branchColumns] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'branch' 
        AND COLUMN_NAME = 'id'
      `);
      
      if (branchColumns.length === 0) {
        throw new Error("Branch table or id column not found. Please ensure branch table exists.");
      }
      
      const branchIdType = branchColumns[0].COLUMN_TYPE;
      console.log("📋 Branch id column type:", branchIdType);
      
      // First, ensure branch table exists
      await Branch.sync({ alter: false });
      console.log("✅ Branch table verified");
      
      console.log("🔵 Adding branchId column to bills table with type:", branchIdType);
      
      // Add the column with the same type as branch.id
      await sequelize.query(`
        ALTER TABLE \`bills\` 
        ADD COLUMN \`branchId\` ${branchIdType} NULL 
        AFTER \`customerId\`
      `);
      console.log("✅ branchId column added");
      
      // Add foreign key constraint
      console.log("🔵 Adding foreign key constraint...");
      await sequelize.query(`
        ALTER TABLE \`bills\` 
        ADD CONSTRAINT \`bills_branchId_fkey\` 
        FOREIGN KEY (\`branchId\`) 
        REFERENCES \`branch\`(\`id\`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
      `);
      console.log("✅ Foreign key constraint added");
      
      // Verify the column was added
      const [verifyColumns] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bills' 
        AND COLUMN_NAME = 'branchId'
      `);
      console.log("📋 Verified branchId column:", verifyColumns[0]);
    }

    console.log("\n✅ Bills table updated successfully!");
    console.log("✅ branchId column is now available in the bills table");

  } catch (error) {
    console.error("❌ Error adding branchId to bills table:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

addBranchIdToBills();

