import type { RequestHandler } from "express";

// Simple mock classifier endpoint to avoid external dependency during dev/demo
export const handlePredict: RequestHandler = async (_req, res) => {
  try {
    // Lightweight randomized but stable-ish output
    const types = ["recyclable", "biodegradable", "hazardous"] as const;
    const pick = types[Math.floor(Math.random() * types.length)];
    const confidence = Math.round((0.8 + Math.random() * 0.2) * 100) / 100; // 0.80 - 1.00
    const processingTime = 100 + Math.floor(Math.random() * 200);

    res.json({ class: pick, confidence, processingTime });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "prediction failed" });
  }
};
