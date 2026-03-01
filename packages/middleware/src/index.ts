import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { closeAll } from "./db/connection";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth";
import brandRoutes from "./routes/brands";
import assetRoutes from "./routes/assets";
import auditRoutes from "./routes/audit";
import { getBrandDb } from "./db/connection";
import { getSyncMeta } from "./db/queries";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("short"));

// Routes
app.use("/auth", authRoutes);
app.use("/brands", brandRoutes);
app.use("/assets", assetRoutes);
app.use("/audit", auditRoutes);

// Health check (no auth required)
app.get("/health", async (_req, res) => {
  let dbConnected = false;
  let lastSync: string | null = null;

  try {
    const db = await getBrandDb();
    const meta = getSyncMeta(db, "brands");
    dbConnected = true;
    lastSync = meta?.last_pull_at ?? null;
  } catch {
    // DB not available
  }

  res.json({
    status: dbConnected ? "ok" : "degraded",
    dbConnected,
    lastSync,
  });
});

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(config.port, config.host, () => {
  console.log(`[brand-sync middleware] listening on http://${config.host}:${config.port}`);
  console.log(`[brand-sync middleware] database: ${config.databasePath}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[brand-sync middleware] shutting down...");
  server.close();
  closeAll();
});

process.on("SIGINT", () => {
  console.log("[brand-sync middleware] shutting down...");
  server.close();
  closeAll();
});

export default app;
