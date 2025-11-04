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
import { productRoutes } from "./src/modules/product/index.js"
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

    // Add timeout to detect hanging sync
    const syncPromise = sequelize.sync({ force: false, alter: false, logging: console.log });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database sync timeout after 30 seconds")), 30000)
    );
    
    await Promise.race([syncPromise, timeoutPromise]);
    
    await seedAdminUser();
    console.log("✅ Step 4: Admin user seeded");

    console.log("✅ Database initialized successfully with associations");
  } catch (error) {
    console.error("❌ Database initialization failed");
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
protectedRoutes.use('/products', productRoutes);



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
