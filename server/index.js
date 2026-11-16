import express from "express";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const required = ["DATABASE_URL", "SESSION_SECRET", "APP_ORIGIN"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("Missing required environment variables:", missing.join(", "));
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  if (process.env.SESSION_SECRET.length < 32) {
    console.error("SESSION_SECRET must be at least 32 characters in production.");
    process.exit(1);
  }
  if (!process.env.APP_ORIGIN.startsWith("https://")) {
    console.error("APP_ORIGIN must use HTTPS in production.");
    process.exit(1);
  }
}

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: true } : undefined
});
const PgSession = connectPgSimple(session);

if (isProduction) app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "10kb" }));

app.use(session({
  store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
  name: "dodo.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many account attempts. Please wait and try again." }
});

function sameOrigin(req, res, next) {
  const origin = req.get("origin");
  const allowed = process.env.APP_ORIGIN;
  if ((isProduction && !origin) || (origin && origin !== allowed)) {
    return res.status(403).json({ error: "Request origin not allowed." });
  }
  next();
}

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validPassword(value) {
  return typeof value === "string" && value.length >= 10 && value.length <= 72;
}

// Serve only the public website files; never expose the repository root.
app.use("/assets", express.static(join(projectDir, "assets"), { maxAge: isProduction ? "1h" : 0 }));
app.get("/", (_req, res) => res.sendFile(join(projectDir, "index.html")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "dodo-hosting-api" });
});

app.get("/api/auth/me", async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  try {
    const result = await pool.query(
      "SELECT id, email, created_at FROM users WHERE id = $1",
      [req.session.userId]
    );
    if (!result.rowCount) {
      req.session.destroy(() => {});
      return res.json({ user: null });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Session lookup failed:", error.message);
    res.status(500).json({ error: "Could not load account." });
  }
});

app.post("/api/auth/register", sameOrigin, authLimiter, async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (!validPassword(password)) {
    return res.status(400).json({ error: "Password must be 10–72 characters." });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email, passwordHash]
    );
    req.session.regenerate((sessionError) => {
      if (sessionError) return res.status(500).json({ error: "Could not start account session." });
      req.session.userId = result.rows[0].id;
      req.session.save((saveError) => {
        if (saveError) return res.status(500).json({ error: "Could not save account session." });
        res.status(201).json({ user: result.rows[0] });
      });
    });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "An account with that email already exists." });
    console.error("Registration failed:", error.message);
    res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/auth/login", sameOrigin, authLimiter, async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || typeof password !== "string" || password.length > 72) {
    return res.status(400).json({ error: "Enter your email and password." });
  }
  try {
    const result = await pool.query(
      "SELECT id, email, password_hash, created_at FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!valid) return res.status(401).json({ error: "Email or password is incorrect." });
    req.session.regenerate((sessionError) => {
      if (sessionError) return res.status(500).json({ error: "Could not start account session." });
      req.session.userId = user.id;
      req.session.save((saveError) => {
        if (saveError) return res.status(500).json({ error: "Could not save account session." });
        res.json({ user: { id: user.id, email: user.email, created_at: user.created_at } });
      });
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(500).json({ error: "Could not sign in." });
  }
});

app.post("/api/auth/logout", sameOrigin, (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ error: "Could not sign out." });
    res.clearCookie("dodo.sid", { httpOnly: true, secure: isProduction, sameSite: "lax" });
    res.json({ success: true });
  });
});

app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found." }));
app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error.message);
  res.status(500).json({ error: "Unexpected server error." });
});

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => console.log(`Dodo Hosting listening on port ${port}`));
async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
