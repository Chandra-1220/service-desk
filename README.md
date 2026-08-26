# Service Desk

A full-stack service-ticket management application built for real teams to log in and use — not just a demo.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL
- Authentication: JWT + bcrypt, with per-account activate/deactivate
- Email: Nodemailer (SMTP) for automatic ticket notifications

## Roles
- **EMPLOYEE** — self-registers, raises tickets and tracks their own tickets
- **TECHNICIAN** — view/pick up tickets, update status & priority, comment
- **ADMIN** — everything above, plus manage every employee account and the system directory

## What's new in this rebuild
- **Self-service employee sign-up** — anyone can create their own account from the login screen with name, department, work email and password. New accounts are created as `EMPLOYEE`; an admin can promote someone to Technician/Admin afterwards from the Users page.
- **Full employee directory management** — admins can view and edit every employee's name, email, department, role and active status, or reset a password, all from one screen.
- **Automatic email notifications**:
  - When an employee raises a ticket, every active administrator is emailed immediately with the ticket details.
  - When a technician/admin moves a ticket to **In Progress**, **Resolved** or **Closed**, the employee who raised it is emailed automatically.
  - New accounts receive a short welcome email.
- Refreshed, professional visual design (indigo/slate design system, split-screen auth page, in-app notices explaining when an email will be sent).
- Everything else from the original build is preserved: ticket lifecycle, assignment, comment threads, the system directory, search/filter, and self-service "Change Password".

## Requirements
Node.js 20+, PostgreSQL 15+

## 1. Database
Create a PostgreSQL database named `service_desk`, then copy `backend/.env.example` to `backend/.env` and fill it in:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/service_desk
JWT_SECRET=<generate a long random value — see below>
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=production

# Optional — see "Email notifications" below
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Service Desk <no-reply@yourcompany.com>
```

Generate a strong `JWT_SECRET` (don't ship the example value):
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 2. Backend
```
cd backend
npm install
npm run db:init   # creates tables + 3 starter accounts (safe to re-run)
npm start         # or `npm run dev` for auto-restart on file changes
```
Backend runs on `http://localhost:5000` (or whatever `PORT` you set).

`npm run db:init` seeds three starter accounts so you can log in immediately:
- Admin: `admin@company.com` / `Admin@123`
- Technician: `technician@company.com` / `Tech@123`
- Employee: `employee@company.com` / `Employee@123`

**Before handing this to real employees:**
1. Log in as the admin account and change its password immediately (sidebar → **Change Password**).
2. From now on, employees can create their own accounts from the login screen ("Create account") — you don't need to add every employee manually. Use the **Users** page only to promote someone to Technician/Admin, edit a profile, deactivate an account, or reset a password.
3. Deactivate or delete the seeded `technician@company.com` and `employee@company.com` demo accounts (Users → edit → uncheck "Account active").

## 3. Email notifications (recommended)
Set `SMTP_HOST`, `SMTP_USER` and `SMTP_PASS` in `backend/.env` to enable:
- Admins get emailed the moment an employee raises a ticket.
- Employees get emailed when their ticket moves to In Progress, Resolved, or Closed.
- New users get a welcome email.

If SMTP isn't configured, the app still works exactly the same — it just logs what would have been sent to the console instead of emailing it, so nothing breaks in local development.

Example for Gmail (use an [App Password](https://support.google.com/accounts/answer/185833), not your normal password):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youraddress@gmail.com
SMTP_PASS=your-16-char-app-password
```
Any standard SMTP provider works (SendGrid, Mailgun, Postmark, Office365, Amazon SES, etc).

## 4. Frontend
```
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

If the backend is hosted elsewhere, create `frontend/.env`:
```
VITE_API_URL=https://your-backend-domain.com/api
```

## How people actually use it day to day
- **New employees** open the app, click **Create account**, fill in name/department/email/password, and they're in — no admin setup required.
- **Employees** click **Raise Ticket**, pick the affected system, and submit. An email goes to every admin right away. They can track their own tickets and get emailed as the status changes.
- **Technicians/Admins** click any ticket row to open it, see the full description and comment thread, and change status/priority/assignee — the employee is emailed automatically when the status changes.
- **Admins** manage the full employee directory under **Users**: edit anyone's name/email/department/role, deactivate accounts, or reset passwords. The **Systems** page manages the list of reportable systems.

## Production deployment
- Frontend can be deployed to Vercel/Netlify/Render Static Sites.
- Backend can be deployed to Render/Railway or another Node-compatible host.
- PostgreSQL can be hosted by Supabase/Neon/Render PostgreSQL.
- `render.yaml` in this repo is a starting point for deploying both services to Render.

**Before going live with real employees, confirm:**
- [ ] Seeded demo passwords have been changed or those accounts deactivated
- [ ] `JWT_SECRET` is a long random value, not the example — the server refuses to start without one
- [ ] `FRONTEND_URL` in the backend `.env` is set to your real frontend domain (restricts CORS)
- [ ] SMTP credentials are set if you want live email notifications
- [ ] The app is served over HTTPS (most hosts do this automatically)
- [ ] Database backups are enabled with your Postgres host
- [ ] `NODE_ENV=production` is set on the backend so it trusts the reverse proxy correctly for rate limiting
