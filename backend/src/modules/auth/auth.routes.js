import express from "express";
import jwt from "jsonwebtoken";
import User from "../user/user.model.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();


//registration 
router.post("/register", async (req, res) => {
  try {
    const { username, password, role, createdBy } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: role || "user",
      createdBy: createdBy || "system", // ✅ fallback to "system" if not provided
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        createdBy: newUser.createdBy,
      },
      token,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

//login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ where: { username } });
  if (!user) return res.status(400).json({ error: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Invalid password" });

  // Attach user info inside JWT
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.json({ token, role: user.role });
});

export default router;
