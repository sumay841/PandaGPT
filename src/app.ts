import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import "./session.d";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Trust Replit's reverse proxy so cookies work correctly on the proxied HTTPS domain
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProd = process.env["NODE_ENV"] === "production";
app.use(
  session({
    secret: process.env["SESSION_SECRET"] ?? "fallback-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: isProd ? "none" : "lax",
    },
  }),
);

app.use("/api", router);

// Serve static frontend files
const frontendDir = path.join(__dirname, "../../ai-homework-helper");
app.use(express.static(frontendDir));
app.use(express.static(path.join(frontendDir, "public")));

export default app;
