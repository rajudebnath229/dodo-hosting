# Dodo Hosting

A Java + Bedrock Minecraft hosting dashboard with Google-only sign-in.

## Project status

The website includes a Google sign-in button and a Node.js API that verifies Google ID tokens on the server. Verified Google identities are stored in PostgreSQL and authenticated with server-side sessions.

**This is still a development foundation, not a live Minecraft hosting service.** It does not yet provision game servers, connect to Pterodactyl/Wings, or process payments. The Create a server control explains this until a secure hosting node is connected.

## Stack

- Frontend: HTML, CSS, vanilla JavaScript, Google Identity Services
- API: Node.js 20+ and Express
- Identity verification: google-auth-library (server-side ID-token verification)
- Database: PostgreSQL
- Sessions: server-side PostgreSQL session store
- Planned game hosting: Pterodactyl Panel + Wings on a separately secured Linux host

## Configure Google sign-in

1. In Google Cloud Console, create or select a project.
2. Configure the OAuth consent screen and create an OAuth client ID of type **Web application**.
3. Add the exact website origin to **Authorized JavaScript origins** (for local development: `http://localhost:3000`; for production: your HTTPS domain).
4. Copy the client ID. Do not put a client secret in browser code.
5. Set `GOOGLE_CLIENT_ID` in the server environment.

Google sign-in is verified by the backend against that client ID. The server checks the Google subject and verified email before creating or finding the account. Existing email/password accounts are not silently linked by matching email.

## Run locally

1. Install Node.js 20 or newer and PostgreSQL.
2. Create a PostgreSQL database for Dodo Hosting.
3. Run `database/schema.sql` for a new database. For an existing database, run `database/migrations/002_google_auth.sql`.
4. Copy `.env.example` to a local file named `.env`.
5. Set `DATABASE_URL`, a long random `SESSION_SECRET`, `APP_ORIGIN=http://localhost:3000`, and `GOOGLE_CLIENT_ID`.
6. Install dependencies with `npm install`.
7. Start the app with `npm run dev`.
8. Open `http://localhost:3000`.

The API serves the homepage and its assets. Use the Node app URL, not a directly opened HTML file, when testing sign-in.

## API routes

- `GET /api/config` — public Google client ID configuration
- `GET /api/health` — service health check
- `GET /api/auth/me` — current signed-in account
- `POST /api/auth/google` — verify Google ID token and create/sign in account
- `POST /api/auth/logout` — sign out

## Security and deployment notes

- Never commit `.env`, database passwords, session secrets, Google client secrets, panel tokens, or SSH keys.
- The Google client ID is public configuration; Google ID tokens must always be verified on the server.
- Use HTTPS and a managed PostgreSQL service in production. Set `APP_ORIGIN` to the exact trusted HTTPS origin.
- Set `PGSSL=true` only when your PostgreSQL provider requires TLS with a valid certificate.
- Add account recovery, deletion, audit logging, monitoring, CSRF testing, and a security review before public launch.
- Never expose panel/API keys in browser code. Authenticate server-management requests on the backend and verify server ownership and plan limits.
- Isolate game servers, apply resource quotas, and keep backups.
- Do not accept payments until pricing, terms, and support processes are ready.

## Next milestones

1. Deploy the Node API and PostgreSQL database and configure Google OAuth origins.
2. Connect a properly secured Minecraft hosting node.
3. Add server records, Java/Bedrock provisioning, start/stop controls, console access, and backups.
4. Define Free and Premium quotas only after infrastructure costs are known.
