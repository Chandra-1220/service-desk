import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

dotenv.config();

const systems = Array.from({ length: 30 }, (_, i) => ({
  code: `SYS-${String(i + 1).padStart(3, "0")}`,
  name: `Production System ${String(i + 1).padStart(2, "0")}`,
  department: i < 20 ? "Production" : i < 25 ? "Quality" : "Administration",
  location: i < 10 ? "Production Line A" : i < 20 ? "Production Line B" : i < 25 ? "Quality Lab" : "Main Office",
  status: "ACTIVE"
}));

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN','TECHNICIAN','EMPLOYEE')),
      department VARCHAR(100),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

    CREATE TABLE IF NOT EXISTS systems (
      id SERIAL PRIMARY KEY,
      system_code VARCHAR(50) UNIQUE NOT NULL,
      system_name VARCHAR(150) NOT NULL,
      department VARCHAR(100) NOT NULL,
      location VARCHAR(150) NOT NULL,
      ip_address VARCHAR(50),
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      ticket_number VARCHAR(30) UNIQUE NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(80) NOT NULL,
      priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
      status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
      system_id INTEGER REFERENCES systems(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      assigned_to INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS ticket_comments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      comment TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
    CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON ticket_comments(ticket_id);
  `);

  const accounts = [
    ["System Administrator", "admin@company.com", "Admin@123", "ADMIN", "IT"],
    ["Production Technician", "technician@company.com", "Tech@123", "TECHNICIAN", "Production"],
    ["Production Employee", "employee@company.com", "Employee@123", "EMPLOYEE", "Production"]
  ];

  for (const [name, email, password, role, department] of accounts) {
    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (!exists.rowCount) {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        "INSERT INTO users(name,email,password_hash,role,department) VALUES($1,$2,$3,$4,$5)",
        [name, email, hash, role, department]
      );
    }
  }

  for (const s of systems) {
    await pool.query(
      `INSERT INTO systems(system_code,system_name,department,location,status)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(system_code) DO NOTHING`,
      [s.code, s.name, s.department, s.location, s.status]
    );
  }

  console.log("Database initialized.");
  await pool.end();
}

init().catch(err => {
  console.error(err);
  process.exit(1);
});
