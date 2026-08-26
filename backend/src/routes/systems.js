import { Router } from "express";
import { pool } from "../db/pool.js";
import { auth, allow } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, async (_req, res) => {
  const result = await pool.query("SELECT * FROM systems ORDER BY system_code");
  res.json(result.rows);
});

router.post("/", auth, allow("ADMIN"), async (req, res) => {
  const { system_code, system_name, department, location, ip_address, status = "ACTIVE" } = req.body;
  if (!system_code || !system_name || !department || !location) {
    return res.status(400).json({ message: "Required system fields are missing" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO systems(system_code,system_name,department,location,ip_address,status)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [system_code, system_name, department, location, ip_address || null, status]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(409).json({ message: "System code already exists" });
  }
});

router.patch("/:id", auth, allow("ADMIN"), async (req, res) => {
  const { system_name, department, location, ip_address, status } = req.body;
  const result = await pool.query(
    `UPDATE systems SET
      system_name=COALESCE($1,system_name),
      department=COALESCE($2,department),
      location=COALESCE($3,location),
      ip_address=COALESCE($4,ip_address),
      status=COALESCE($5,status)
     WHERE id=$6 RETURNING *`,
    [system_name, department, location, ip_address, status, req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ message: "System not found" });
  res.json(result.rows[0]);
});

export default router;
