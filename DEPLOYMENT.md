# Free deployment outline

## PostgreSQL
Create a free PostgreSQL database on a provider such as Supabase or Neon.
Copy its connection string.

## Backend
Deploy `backend/` to a Node-compatible host.
Environment variables:
- DATABASE_URL
- JWT_SECRET
- FRONTEND_URL=https://your-frontend-domain
- SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM (optional — enables ticket email notifications)

After deployment, run the database initialization once:
```
npm install
npm run db:init
```

## Frontend
Deploy `frontend/` to Vercel.
Set:
```
VITE_API_URL=https://your-backend-domain/api
```

Build command:
```
npm run build
```

Output directory:
```
dist
```

## Email notifications
This app uses Nodemailer over SMTP. Any SMTP provider works (Gmail with an App Password,
SendGrid, Mailgun, Postmark, Office 365, Amazon SES). If SMTP env vars are left blank,
the backend runs fine — it just skips sending and logs what would have gone out.

## Security
Do not use the demo passwords in a real company deployment.
