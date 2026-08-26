import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { auth, allow } from "../middleware/auth.js";
import { sendWelcomeEmail } from "../utils/mailer.js";

const router = Router();
const ROLES = ["ADMIN", "TECHNICIAN", "EMPLOYEE"];

// Admin: full directory of every account (employees, technicians, admins).
router.get("/", auth, allow("ADMIN"), async (_req, res) => {
  const result = await pool.query(
    "SELECT id,name,email,role,department,active,created_at FROM users ORDER BY created_at DESC"
  );
  res.json(result.rows);
});

// Used to populate the "assign to" dropdown on tickets — visible to admins and technicians.
router.get("/technicians", auth, allow("ADMIN", "TECHNICIAN"), async (_req, res) => {
  const result = await pool.query(
    "SELECT id,name,role FROM users WHERE role IN ('ADMIN','TECHNICIAN') AND active=true ORDER BY name"
  );
  res.json(result.rows);
});

router.post("/", auth, allow("ADMIN"), async (req, res) => {
  const { name, email, password, role, department } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Name, email, password and role are required" });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users(name,email,password_hash,role,department)
       VALUES($1,$2,$3,$4,$5)
       RETURNING id,name,email,role,department,active,created_at`,
      [name.trim(), email.toLowerCase().trim(), hash, role, department || null]
    );
    const user = result.rows[0];
    sendWelcomeEmail({ user }).catch(() => {});
    res.status(201).json(user);
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ message: "A user with that email already exists" });
    }
    res.status(500).json({ message: "Unable to create user" });
  }
});

// Admin: edit any employee's profile — name, email, department, role and active status.
router.patch("/:id", auth, allow("ADMIN"), async (req, res) => {
  const { name, email, role, department, active } = req.body;

  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  if (Number(req.params.id) === req.user.id && active === false) {
    return res.status(400).json({ message: "You cannot deactivate your own account" });
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET
        name=COALESCE($1,name),
        email=COALESCE($2,email),
        role=COALESCE($3,role),
        department=COALESCE($4,department),
        active=COALESCE($5,active)
       WHERE id=$6
       RETURNING id,name,email,role,department,active,created_at`,
      [
        name?.trim() || null,
        email ? email.toLowerCase().trim() : null,
        role || null,
        department,
        active,
        req.params.id
      ]
    );
    if (!result.rowCount) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ message: "A user with that email already exists" });
    }
    res.status(500).json({ message: "Unable to update user" });
  }
});

router.post("/:id/reset-password", auth, allow("ADMIN"), async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    "UPDATE users SET password_hash=$1 WHERE id=$2 RETURNING id",
    [hash, req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ message: "User not found" });
  res.json({ message: "Password reset" });
});

export default router;
