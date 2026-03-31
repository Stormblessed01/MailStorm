import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/authRoutes.js";
import { mergeRouter } from "./routes/mergeRoutes.js";
import { startScheduler } from "./services/scheduler.js";

loadEnv({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const app = express();
const port = Number(process.env.PORT || 8787);

function parseOrigins(raw?: string): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const allowedOrigins = parseOrigins(process.env.FRONTEND_ORIGIN);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin is not allowed."));
    }
  })
);
app.use(express.json({ limit: "5mb" }));
app.use("/api/auth", authRouter);
app.use("/api", mergeRouter);

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "mailstorm-backend" });
});

app.listen(port, () => {
  console.log(`[mailstorm-backend] listening on http://localhost:${port}`);
  startScheduler();
});
