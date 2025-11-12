import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initDatabase } from "./db/connection";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Add an Express error handler to log stack traces and return JSON in development
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        // Log full error
        console.error('[Express Error] ', err?.stack || err?.message || err);
        if (!res.headersSent) {
                res.status(500).json({ error: err?.message || 'Internal Server Error', stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined });
        }
});

// Global process-level handlers
process.on('uncaughtException', (err) => {
        console.error('[Process] Uncaught Exception:', err?.stack || err?.message || err);
        // don't exit in dev; consider graceful shutdown in production
});

process.on('unhandledRejection', (reason) => {
        console.error('[Process] Unhandled Rejection:', reason);
        // don't exit in dev; consider graceful shutdown in production
});

(async () => {
  // Initialize database tables
  await initDatabase();

  const server = await registerRoutes(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = parseInt(process.env.PORT || "5000", 10);
  const HOST = "0.0.0.0";
  
  server.listen(PORT, HOST, () => {
    log(`Server running on http://${HOST}:${PORT}`);
  });
})();


