# Dodo Hosting

A Java + Bedrock Minecraft server hosting dashboard.

## Project status
This repository starts the Dodo Hosting web dashboard foundation. It is **not yet a production Minecraft hosting service**. Real server provisioning requires a separately secured Linux host running a server-management layer such as Pterodactyl Panel and Wings.

## Planned stack
- Frontend: HTML, CSS, vanilla JavaScript
- API: Node.js
- Database: PostgreSQL
- Server management: Pterodactyl Panel + Wings
- Editions: Java and Bedrock
- Plans: Free and Premium (limits and pricing to be decided after infrastructure costs are known)

## Security requirements
- Never expose panel/API keys in browser code.
- Authenticate every server-management request on the backend.
- Verify server ownership and plan limits on every operation.
- Isolate game servers, apply resource quotas, and keep backups.
- Do not accept payments until pricing, terms, and support processes are ready.

## Run the static dashboard
Open `index.html` in a browser. The current dashboard uses sample data only; its controls do not start real Minecraft servers.
