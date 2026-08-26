import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import systemRoutes from "./routes/systems.js";
import ticketRoutes from "./routes/tickets.js";
import dashboardRoutes from "./routes/dashboard.js";
import { isEmailEnabled } from "./utils/mailer.js";

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Refusing to start.");
  process.exit(1);
}

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : true
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "Service Desk API", email: isEmailEnabled ? "enabled" : "disabled" })
);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/systems", systemRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((_req, res) => res.status(404).json({ message: "Not found" }));

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`API running on port ${port}`);
  console.log(`Email notifications: ${isEmailEnabled ? "enabled" : "disabled (set SMTP_* env vars to enable)"}`);
});
