import { Router } from "express";
import { pool } from "../db/pool.js";
import { auth, allow } from "../middleware/auth.js";

const router = Router();

router.get("/summary", auth, allow("ADMIN", "TECHNICIAN"), async (_req, res) => {
  const [systems, tickets, critical, resolved] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM systems WHERE status='ACTIVE'"),
    pool.query("SELECT COUNT(*)::int AS count FROM tickets WHERE status NOT IN ('RESOLVED','CLOSED')"),
    pool.query("SELECT COUNT(*)::int AS count FROM tickets WHERE priority='CRITICAL' AND status NOT IN ('RESOLVED','CLOSED')"),
    pool.query("SELECT COUNT(*)::int AS count FROM tickets WHERE status IN ('RESOLVED','CLOSED')")
  ]);

  res.json({
    systems: systems.rows[0].count,
    openTickets: tickets.rows[0].count,
    criticalTickets: critical.rows[0].count,
    resolvedTickets: resolved.rows[0].count
  });
});

export default router;
