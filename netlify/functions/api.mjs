import { createHmac, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import pg from "pg";

const { Pool } = pg;
const readEnv = (key) => Netlify.env.get(key);
let pool;
const getPool = () => {
  const url = readEnv("DATABASE_URL");
  if (!url) throw new Error("DATABASE_URL is not configured.");
  if (!pool) pool = new Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 });
  return pool;
};
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
const cookieName = "dodo_session";
const cookieOptions = "Path=/; HttpOnly; Secure; SameSite=Lax";
function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return body + "." + signature;
}
function verify(token, secret) {
  if (!token || token.length > 2048) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  let actual;
  try { actual = Buffer.from(signature, "base64url"); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.sub || !Number.isInteger(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
function getCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}
function allowedOrigin(req) {
  const configured = readEnv("APP_ORIGIN");
  const origin = req.headers.get("origin");
  if (!configured || !origin) return false;
  try { return new URL(origin).origin === new URL(configured).origin; } catch { return false; }
}
function sessionCookie(token, maxAge = 604800) {
  return `${cookieName}=${encodeURIComponent(token)}; ${cookieOptions}; Max-Age=${maxAge}`;
}
function clearCookie() {
  return `${cookieName}=; ${cookieOptions}; Max-Age=0`;
}
function getSession(req) {
  const secret = readEnv("SESSION_SECRET");
  if (!secret || secret.length < 32) return null;
  return verify(getCookie(req, cookieName), secret);
}
const googleClient = () => {
  const clientId = readEnv("GOOGLE_CLIENT_ID");
  if (!clientId) throw new Error("Google sign-in is not configured yet.");
  return { clientId, client: new OAuth2Client(clientId) };
};

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/config" && req.method === "GET") {
    const clientId = readEnv("GOOGLE_CLIENT_ID");
    if (!clientId) return json({ error: "Google sign-in is not configured yet." }, 503);
    return json({ googleClientId: clientId });
  }

  if (path === "/api/auth/me" && req.method === "GET") {
    const session = getSession(req);
    if (!session) return json({ user: null });
    try {
      const result = await getPool().query("SELECT id, email, created_at FROM users WHERE id = $1", [session.sub]);
      if (!result.rowCount) return json({ user: null }, 200, { "Set-Cookie": clearCookie() });
      return json({ user: result.rows[0] });
    } catch (error) {
      console.error("Account lookup failed:", error.message);
      return json({ error: "Account database is not ready. Check the database setup." }, 503);
    }
  }

  if (path === "/api/auth/logout" && req.method === "POST") {
    if (!allowedOrigin(req)) return json({ error: "Request origin not allowed." }, 403);
    return json({ success: true }, 200, { "Set-Cookie": clearCookie() });
  }

  if (path === "/api/auth/google" && req.method === "POST") {
    if (!allowedOrigin(req)) return json({ error: "Request origin not allowed." }, 403);
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid sign-in request." }, 400); }
    if (typeof body?.credential !== "string" || body.credential.length > 10000) {
      return json({ error: "Google sign-in response is missing. Please try again." }, 400);
    }
    try {
      const { clientId, client } = googleClient();
      const ticket = await client.verifyIdToken({ idToken: body.credential, audience: clientId });
      const profile = ticket.getPayload();
      if (!profile?.sub || !profile.email || profile.email_verified !== true) {
        return json({ error: "Use a Google account with a verified email address." }, 401);
      }
      const result = await getPool().query(
        `INSERT INTO users (email, google_sub)
         VALUES ($1, $2)
         ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email
         RETURNING id, email, created_at`,
        [profile.email.trim().toLowerCase(), profile.sub]
      );
      const secret = readEnv("SESSION_SECRET");
      if (!secret || secret.length < 32) return json({ error: "Secure sessions are not configured. Contact the site administrator." }, 503);
      const token = sign({ sub: String(result.rows[0].id), exp: Math.floor(Date.now() / 1000) + 604800 }, secret);
      return json({ user: result.rows[0] }, 200, { "Set-Cookie": sessionCookie(token) });
    } catch (error) {
      if (error.code === "23505") return json({ error: "This email already belongs to another account. Contact support." }, 409);
      console.error("Google sign-in failed:", error.message);
      return json({ error: "Google sign-in could not be verified, or the database is not configured." }, 503);
    }
  }

  return json({ error: "API route not found." }, 404);
};

export const config = {
  path: ["/api/config", "/api/auth/me", "/api/auth/google", "/api/auth/logout"]
};
