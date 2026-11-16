# Dodo Hosting

A Java + Bedrock Minecraft hosting dashboard and account API foundation.

## Project status

The website now includes sign-in and account-registration screens connected to a Node.js API. The API stores password hashes and server-side sessions in PostgreSQL.

**This is a development foundation, not a production Minecraft hosting service.** It does not provision Minecraft servers, connect to a game-server host, process payments, or include account email verification and password recovery.

## Stack

- Frontend: HTML, CSS, vanilla JavaScript
- API: Node.js 20+ and Express
- Database: PostgreSQL
- Password storage: bcrypt hashes
- Sessions: server-side PostgreSQL session store
- Future server management: Pterodactyl Panel + Wings on a separately secured Linux host

## Run locally

1. Install Node.js 20 or newer and PostgreSQL.
2. Create a PostgreSQL database for Dodo Hosting.
3. Run `database/schema.sql` against that database using your PostgreSQL tool.
4. Copy `.env.example` to a local file named `.env`.
5. In `.env`, set `DATABASE_URL`, `SESSION_SECRET`, and `APP_ORIGIN=http://localhost:3000`. Keep the secret private.
6. Install dependencies with `npm install`.
7. Start the app with `npm run dev`.
8. Open `http://localhost:3000`.

The API serves the homepage and its assets, so use the Node app URL rather than opening `index.html` directly when testing account registration or login. The PostgreSQL session table is created automatically by the session store; the `users` table must be created with `database/schema.sql` first.

## API routes

- `GET /api/health` — service health check
- `GET /api/auth/me` — current signed-in account
- `POST /api/auth/register` — create account with email and password
- `POST /api/auth/login` — sign in
- `POST /api/auth/logout` — sign out

The API accepts JSON request bodies. Passwords must be 10–72 characters. Sessions use HTTP-only, SameSite=Lax cookies; secure cookies are enabled in production. Account attempts are rate-limited, and write requests are checked against the configured app origin.

## Security and deployment notes

- Never commit `.env`, database passwords, session secrets, panel tokens, or SSH keys.
- Use HTTPS and a managed PostgreSQL service for any hosted deployment.
- Set `APP_ORIGIN` to the exact trusted HTTPS frontend/app origin in production.
- Set `PGSSL=true` only when your PostgreSQL provider requires TLS with a valid certificate.
- Add email verification, password reset, account deletion, audit logging, monitoring, CSRF testing, and security review before a public launch.
- Never expose panel/API keys in browser code.
- Authenticate every server-management request on the backend and verify server ownership and plan limits.
- Isolate game servers, apply resource quotas, and keep backups.
- Do not accept payments until pricing, terms, and support processes are ready.

## Next milestones

1. Connect the account dashboard to real user-owned server records.
2. Connect a properly secured Minecraft hosting node.
3. Add server creation, start/stop controls, console access, and backups.
4. Define Free and Premium quotas only after infrastructure costs are known.

The current server list and server-creation control are still previews. Signing in does not create a Minecraft server.
