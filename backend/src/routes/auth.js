import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { pool } from "../db/pool.js";
import { auth } from "../middleware/auth.js";
import { sendWelcomeEmail } from "../utils/mailer.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in a few minutes." }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many sign-up attempts. Please try again later." }
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department };
}

// Self-service account creation — always creates an EMPLOYEE account.
// Employees raise their own tickets; ADMIN/TECHNICIAN accounts are
// provisioned by an administrator from the Users page.
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { name, department, email, password } = req.body;

    if (!name?.trim() || !department?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, department, email and password are required" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users(name,email,password_hash,role,department)
       VALUES($1,$2,$3,'EMPLOYEE',$4)
       RETURNING id,name,email,role,department,active,created_at`,
      [name.trim(), normalizedEmail, hash, department.trim()]
    );

    const user = result.rows[0];
    const token = signToken(user);

    sendWelcomeEmail({ user }).catch(() => {});

    res.status(201).json({ token, user: publicUser(user) });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ message: "An account with that email already exists" });
    }
    res.status(500).json({ message: "Unable to create account" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email.toLowerCase().trim()]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.active) {
      return res.status(403).json({ message: "This account has been deactivated. Contact your administrator." });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT id,name,email,role,department FROM users WHERE id=$1 AND active=true",
    [req.user.id]
  );
  if (!result.rowCount) return res.status(401).json({ message: "Account no longer active" });
  res.json(result.rows[0]);
});

router.post("/change-password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters" });
  }

  const result = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, user.id]);
  res.json({ message: "Password updated" });
});

export default router;
