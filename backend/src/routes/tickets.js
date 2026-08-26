import { Router } from "express";
import { pool } from "../db/pool.js";
import { auth, allow } from "../middleware/auth.js";
import { sendTicketCreatedToAdmins, sendTicketStatusUpdateToEmployee } from "../utils/mailer.js";

const router = Router();

function ticketNumber(id) {
  return `INC-${String(id).padStart(6, "0")}`;
}

router.get("/", auth, async (req, res) => {
  const { status, priority, search } = req.query;
  const values = [];
  const conditions = [];

  if (req.user.role === "EMPLOYEE") {
    values.push(req.user.id);
    conditions.push(`t.created_by=$${values.length}`);
  } else if (req.user.role === "TECHNICIAN") {
    values.push(req.user.id);
    conditions.push(`(t.assigned_to=$${values.length} OR t.assigned_to IS NULL)`);
  }

  if (status) {
    values.push(status);
    conditions.push(`t.status=$${values.length}`);
  }

  if (priority) {
    values.push(priority);
    conditions.push(`t.priority=$${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(t.ticket_number ILIKE $${values.length} OR t.title ILIKE $${values.length} OR s.system_code ILIKE $${values.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(`
    SELECT t.*, s.system_code, s.system_name,
           creator.name AS creator_name, creator.email AS creator_email,
           assignee.name AS assignee_name
    FROM tickets t
    LEFT JOIN systems s ON s.id=t.system_id
    JOIN users creator ON creator.id=t.created_by
    LEFT JOIN users assignee ON assignee.id=t.assigned_to
    ${where}
    ORDER BY t.created_at DESC
  `, values);

  res.json(result.rows);
});

router.post("/", auth, async (req, res) => {
  const { title, description, category, priority, system_id } = req.body;

  if (!title || !description || !category || !priority || !system_id) {
    return res.status(400).json({ message: "Please complete all required fields" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insert = await client.query(
      `INSERT INTO tickets(ticket_number,title,description,category,priority,status,system_id,created_by)
       VALUES('TEMP',$1,$2,$3,$4,'OPEN',$5,$6) RETURNING id`,
      [title, description, category, priority, system_id, req.user.id]
    );

    const id = insert.rows[0].id;
    const number = ticketNumber(id);
    const result = await client.query(
      "UPDATE tickets SET ticket_number=$1 WHERE id=$2 RETURNING *",
      [number, id]
    );
    await client.query("COMMIT");
    const ticket = result.rows[0];
    res.status(201).json(ticket);

    // Notify every administrator that a new ticket has come in. Fire-and-forget
    // so a slow/unavailable mail provider never delays the ticket response.
    notifyAdminsOfNewTicket(ticket).catch((err) =>
      console.error("[tickets] Failed to notify admins of new ticket:", err.message)
    );
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Unable to create ticket" });
  } finally {
    client.release();
  }
});

async function notifyAdminsOfNewTicket(ticket) {
  const [admins, creator, system] = await Promise.all([
    pool.query("SELECT name,email FROM users WHERE role='ADMIN' AND active=true"),
    pool.query("SELECT name,email,department FROM users WHERE id=$1", [ticket.created_by]),
    ticket.system_id
      ? pool.query("SELECT system_code,system_name FROM systems WHERE id=$1", [ticket.system_id])
      : Promise.resolve({ rows: [] })
  ]);

  if (!admins.rowCount || !creator.rowCount) return;

  const sys = system.rows[0];
  await sendTicketCreatedToAdmins({
    admins: admins.rows,
    ticket,
    creator: creator.rows[0],
    systemLabel: sys ? `${sys.system_code} — ${sys.system_name}` : undefined
  });
}

router.patch("/:id", auth, allow("ADMIN", "TECHNICIAN"), async (req, res) => {
  const { status, priority, assigned_to } = req.body;
  const resolved = status === "RESOLVED" || status === "CLOSED";

  const previous = await pool.query("SELECT status FROM tickets WHERE id=$1", [req.params.id]);
  if (!previous.rowCount) return res.status(404).json({ message: "Ticket not found" });
  const previousStatus = previous.rows[0].status;

  const result = await pool.query(
    `UPDATE tickets SET
      status=COALESCE($1,status),
      priority=COALESCE($2,priority),
      assigned_to=COALESCE($3,assigned_to),
      updated_at=NOW(),
      resolved_at=CASE WHEN $4 THEN COALESCE(resolved_at,NOW()) ELSE resolved_at END
     WHERE id=$5 RETURNING *`,
    [status, priority, assigned_to || null, resolved, req.params.id]
  );

  if (!result.rowCount) return res.status(404).json({ message: "Ticket not found" });
  const ticket = result.rows[0];
  res.json(ticket);

  // Email the employee who raised the ticket whenever the status moves
  // into "in progress" or "resolved/closed" — but only when it actually changed.
  const notifiableStatuses = ["IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (status && status !== previousStatus && notifiableStatuses.includes(status)) {
    notifyEmployeeOfStatusChange(ticket, req.user).catch((err) =>
      console.error("[tickets] Failed to notify employee of status change:", err.message)
    );
  }
});

async function notifyEmployeeOfStatusChange(ticket, actor) {
  const creator = await pool.query("SELECT name,email FROM users WHERE id=$1", [ticket.created_by]);
  if (!creator.rowCount) return;
  await sendTicketStatusUpdateToEmployee({
    employee: creator.rows[0],
    ticket,
    actor: { name: actor.name }
  });
}

router.post("/:id/comments", auth, async (req, res) => {
  const { comment } = req.body;
  if (!comment?.trim()) return res.status(400).json({ message: "Comment is required" });

  const result = await pool.query(
    "INSERT INTO ticket_comments(ticket_id,user_id,comment) VALUES($1,$2,$3) RETURNING *",
    [req.params.id, req.user.id, comment.trim()]
  );
  res.status(201).json(result.rows[0]);
});

router.get("/:id/comments", auth, async (req, res) => {
  const result = await pool.query(
    `SELECT c.*, u.name AS user_name, u.role
     FROM ticket_comments c JOIN users u ON u.id=c.user_id
     WHERE c.ticket_id=$1 ORDER BY c.created_at`,
    [req.params.id]
  );
  res.json(result.rows);
});

export default router;
