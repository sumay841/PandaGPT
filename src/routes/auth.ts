import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db";

const router: IRouter = Router();
const SALT_ROUNDS = 12;

// ── POST /api/auth/register ──────────────────────────────────────
router.post("/auth/register", async (req: Request, res: Response) => {
  const { fullName, username, email, password } = req.body as {
    fullName?: string;
    username?: string;
    email?: string;
    password?: string;
  };

  if (!fullName || !username || !email || !password) {
    res.status(400).json({ error: "All fields are required." });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, email`,
      [fullName.trim(), username.trim().toLowerCase(), email.trim().toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    req.session.userId   = user.id;
    req.session.username = user.username;
    req.session.fullName = user.full_name;
    req.session.email    = user.email;

    res.json({ id: user.id, username: user.username, fullName: user.full_name, email: user.email });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "Email or username already taken." });
    } else {
      req.log.error({ err }, "Register error");
      res.status(500).json({ error: "Registration failed. Please try again." });
    }
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────
router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT id, username, full_name, email, password_hash FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    req.session.userId   = user.id;
    req.session.username = user.username;
    req.session.fullName = user.full_name;
    req.session.email    = user.email;

    res.json({ id: user.id, username: user.username, fullName: user.full_name, email: user.email });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────
router.post("/auth/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ── GET /api/auth/me ─────────────────────────────────────────────
router.get("/auth/me", (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  res.json({
    id: req.session.userId,
    username: req.session.username,
    fullName: req.session.fullName,
    email: req.session.email,
  });
});

export default router;
