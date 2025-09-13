import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { aiChatHandler } from "./routes/ai-chat";
import { handlePredict } from "./routes/predict";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // AI chat proxy route
  app.post("/api/ai-chat", aiChatHandler);

  // ML prediction endpoint (dev-friendly mock)
  app.post("/api/predict", handlePredict);

  return app;
}
