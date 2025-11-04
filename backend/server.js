import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import os from "os";
import authRoutes from "./src/modules/auth/auth.routes.js";
import { authenticate } from "./src/shared/middlewares/auth.js";
import { connectDB } from "./src/config/db.js";
import sequelize from "./src/config/db.js";
import { apiLimiter } from "./src/shared/middlewares/rateLimit.js";
import { seedAdminUser } from "./src/shared/seedAdmin.js";
import { notFound } from "./src/shared/middlewares/notFound.js";
import { errorHandler } from "./src/shared/middlewares/errorHandler.js";

import { customerRoute } from "./src/modules/customer/index.js"
import { brandRoutes } from "./src/modules/brand/index.js"
import { unitRoutes } from "./src/modules/unit/index.js"
import { categoryRoutes } from "./src/modules/category/index.js"
import { supplierRoutes } from "./src/modules/supplier/index.js"
import { addressRoutes } from "./src/modules/address/index.js"
import { stockRoutes } from "./src/modules/stock/index.js"
import { productRoutes } from "./src/modules/product/index.js"
import { purchaseOrderRoutes } from "./src/modules/purchaseOrder/index.js"

const app = express();

dotenv.config();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use("/api", apiLimiter);

const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log("✅ Database connection established");

    // Sync database schema with models
    // alter: true will add missing columns and modify existing ones to match models
    // This is safe for development but should be disabled in production
    const isDevelopment = process.env.NODE_ENV !== "production";
    
    if (isDevelopment) {
      console.log("🔄 Syncing database schema (alter mode enabled for development)...");
      console.log("⏳ This may take a while if there are schema changes...");
      
      // Sync without timeout - let it complete naturally
      // Alter operations can take time depending on table size and changes needed
      await sequelize.sync({ 
        force: false, 
        alter: true, // Enable alter in development only
        logging: false // Disable verbose logging to speed up
      });
      
      console.log("✅ Database schema synced successfully");
    } else {
      console.log("⚠️  Production mode: Database schema sync disabled");
      // In production, just sync without alter
      await sequelize.sync({ 
        force: false, 
        alter: false,
        logging: false 
      });
    }
    
    await seedAdminUser();
    console.log("✅ Admin user seeded");

    console.log("✅ Database initialized successfully with associations");
  } catch (error) {
    console.error("❌ Database initialization failed");
    console.error("Error:", error.message);
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
    // Don't exit immediately - let the user see the error
    console.error("\n💡 Tip: If sync is timing out, check database connection and table locks");
    process.exit(1);
  }
};

// Initialize database before setting up routes
await initializeDatabase();

app.get("/health", (req, res) => {
  res.send(`server is running and healthy ;)`);
});

// routes without auth  (/api/auth/login)
app.use("/api/auth", authRoutes);

const protectedRoutes = express.Router();

// Mount all module routes on protected routes


protectedRoutes.use('/customers', customerRoute);
protectedRoutes.use('/brands', brandRoutes);
protectedRoutes.use('/units', unitRoutes);
protectedRoutes.use('/categories', categoryRoutes);
protectedRoutes.use('/suppliers', supplierRoutes);
protectedRoutes.use('/address', addressRoutes);
protectedRoutes.use('/stock', stockRoutes);
protectedRoutes.use('/products', productRoutes);
protectedRoutes.use('/pos', purchaseOrderRoutes);


// Now apply auth + mount once
app.use("/api", authenticate, protectedRoutes);

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "0.0.0.0";
}

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

app.listen(PORT, `0.0.0.0`, () => {
  try {
    const ip = getLocalIp();
    console.log(`
        
        server is running:  http://localhost:${PORT}
                            http://${ip}:${PORT} 
    `);
  } catch (err) {
    console.log(`error in running server ${err}`);
  }
});
