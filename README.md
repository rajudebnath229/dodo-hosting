# Dodo Hosting

A Java + Bedrock Minecraft hosting dashboard and API foundation.

## Project status

The repository contains a static dashboard and the first backend milestone: account registration, login, logout, and session lookup. **This is still a development foundation, not a production hosting service.** It does not provision Minecraft servers, connect to Pterodactyl, process payments, or provide a production-ready account recovery flow.

## Stack

- Frontend: HTML, CSS, vanilla JavaScript
- API: Node.js 20+ and Express
- Database: PostgreSQL
- Password storage: bcrypt password hashes
- Sessions: server-side PostgreSQL session store
- Future server management: Pterodactyl Panel + Wings on a separately secured Linux host

## Run the API locally

1. Install Node.js 20 or newer and PostgreSQL.
2. Create a PostgreSQL database.
3. Run the SQL in `database/schema.sql` against that database.
4. Copy `.env.example` to `.env` and fill in your local database URL and a long random session secret.
5. Run `npm install`.
6. Run `npm run dev`.
7. Open `http://localhost:3000/api/health` to check the API.

The session table is created automatically by the PostgreSQL session store. The users table must be created with the SQL schema first.

## API routes

- `GET /api/health` — service health check
- `GET /api/auth/me` — current signed-in account
- `POST /api/auth/register` — create account with email and password
- `POST /api/auth/login` — sign in
- `POST /api/auth/logout` — sign out

The API expects JSON request bodies. Passwords must be 10–72 characters. Sessions use HTTP-only, SameSite=Lax cookies; secure cookies are enabled in production. Authentication attempts are rate-limited.

## Security and deployment notes

- Never commit `.env`, database passwords, session secrets, panel tokens, or SSH keys.
- Use HTTPS and a managed PostgreSQL service for any hosted deployment.
- Set `APP_ORIGIN` to the exact trusted frontend origin in deployment.
- Configure database TLS according to your provider.
- Add CSRF protection appropriate to the final deployment topology before exposing account actions publicly.
- Add email verification, password reset, account deletion, audit logging, monitoring, and security testing before real public launch.
- Never expose panel/API keys in browser code.
- Authenticate every server-management request on the backend and verify server ownership and plan limits.
- Isolate game servers, apply resource quotas, and keep backups.
- Do not accept payments until pricing, terms, and support processes are ready.

## Current dashboard

Open `index.html` to view the static dashboard. Its server controls are preview-only and do not start Minecraft servers.
