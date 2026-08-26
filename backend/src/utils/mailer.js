import nodemailer from "nodemailer";

/**
 * Central mail utility.
 *
 * If SMTP_HOST / SMTP_USER / SMTP_PASS are not configured, the app keeps
 * running normally and simply logs what *would* have been sent — this
 * means the service desk works out of the box in local/dev environments
 * without forcing an email provider on anyone, while behaving fully in
 * production once SMTP credentials are supplied.
 */

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

let transporter = null;

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  console.warn(
    "[mailer] SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing). " +
    "Email notifications will be logged to the console instead of sent."
  );
}

const FROM = process.env.SMTP_FROM || "Service Desk <no-reply@servicedesk.local>";
const APP_URL = process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173";

function wrapHtml({ heading, intro, rows = [], ctaLabel, ctaUrl, footer }) {
  const rowsHtml = rows
    .map(
      (r) => `
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;width:140px;vertical-align:top;">${r.label}</td>
          <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;">${r.value}</td>
        </tr>`
    )
    .join("");

  return `
  <div style="background:#f1f5f9;padding:32px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#111a2e;padding:22px 28px;">
        <span style="color:#818cf8;font-weight:700;font-size:13px;letter-spacing:.4px;">SERVICE DESK</span>
      </div>
      <div style="padding:28px;">
        <h2 style="margin:0 0 10px;font-size:19px;color:#0f172a;">${heading}</h2>
        <p style="margin:0 0 18px;font-size:13.5px;line-height:1.6;color:#475569;">${intro}</p>
        ${rows.length ? `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;border-top:1px solid #eef2f7;padding-top:6px;">${rowsHtml}</table>` : ""}
        ${
          ctaUrl
            ? `<a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 18px;border-radius:8px;">${ctaLabel}</a>`
            : ""
        }
        ${footer ? `<p style="margin:22px 0 0;font-size:11.5px;color:#94a3b8;">${footer}</p>` : ""}
      </div>
    </div>
  </div>`;
}

async function send({ to, subject, html }) {
  if (!to) return;

  if (!transporter) {
    console.log(`[mailer:noop] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    // Email delivery must never break the request that triggered it.
    console.error(`[mailer] Failed to send "${subject}" to ${to}:`, err.message);
  }
}

export async function sendTicketCreatedToAdmins({ admins, ticket, creator, systemLabel }) {
  const html = wrapHtml({
    heading: "New service ticket raised",
    intro: `${creator.name} from ${creator.department || "—"} has raised a new ticket that needs attention.`,
    rows: [
      { label: "Ticket", value: ticket.ticket_number },
      { label: "Title", value: ticket.title },
      { label: "Priority", value: ticket.priority },
      { label: "System", value: systemLabel || "—" },
      { label: "Raised by", value: `${creator.name} (${creator.email})` }
    ],
    ctaLabel: "Open Service Desk",
    ctaUrl: APP_URL,
    footer: "You are receiving this because you are listed as an administrator on the Service Desk."
  });

  await Promise.all(
    admins.map((admin) =>
      send({ to: admin.email, subject: `New ticket ${ticket.ticket_number}: ${ticket.title}`, html })
    )
  );
}

export async function sendTicketStatusUpdateToEmployee({ employee, ticket, actor }) {
  const statusLabel = ticket.status.replace("_", " ");
  const heading =
    ticket.status === "RESOLVED" || ticket.status === "CLOSED"
      ? "Your ticket has been resolved"
      : "Your ticket is being worked on";

  const html = wrapHtml({
    heading,
    intro: `Ticket ${ticket.ticket_number} — "${ticket.title}" was updated to <strong>${statusLabel}</strong>${actor ? ` by ${actor.name}` : ""}.`,
    rows: [
      { label: "Ticket", value: ticket.ticket_number },
      { label: "Status", value: statusLabel },
      { label: "Priority", value: ticket.priority }
    ],
    ctaLabel: "View Ticket",
    ctaUrl: APP_URL,
    footer: "You are receiving this because you raised this ticket on the Service Desk."
  });

  await send({
    to: employee.email,
    subject: `Ticket ${ticket.ticket_number} is now ${statusLabel}`,
    html
  });
}

export async function sendWelcomeEmail({ user }) {
  const html = wrapHtml({
    heading: "Welcome to the Service Desk",
    intro: `Hi ${user.name.split(" ")[0]}, your account has been created. You can now sign in and start raising service tickets.`,
    rows: [
      { label: "Email", value: user.email },
      { label: "Department", value: user.department || "—" }
    ],
    ctaLabel: "Sign In",
    ctaUrl: APP_URL
  });

  await send({ to: user.email, subject: "Welcome to the Service Desk", html });
}

export const isEmailEnabled = smtpConfigured;
