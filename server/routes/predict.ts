import type { RequestHandler } from "express";

// If EXTERNAL_PREDICT_URL is set, proxy requests to the external model service.
// Otherwise, return a mock response for development.
export const handlePredict: RequestHandler = async (req, res) => {
  try {
    const external = process.env.EXTERNAL_PREDICT_URL;
    if (external) {
      const headers: Record<string, string> = {};
      const ct = req.headers["content-type"];
      if (ct && typeof ct === "string") headers["content-type"] = ct;

      const resp = await fetch(external, {
        method: "POST",
        headers,
        // Forward the incoming multipart stream directly
        body: req as any,
        // Node.js fetch requires duplex when streaming a request body
        // @ts-expect-error Node fetch option
        duplex: "half",
      });

      // Forward status and body transparently
      const buf = Buffer.from(await resp.arrayBuffer());
      res.status(resp.status);
      // Try to forward JSON if possible; else send raw
      const respCT = resp.headers.get("content-type") || "";
      if (respCT.includes("application/json")) {
        try {
          const json = JSON.parse(buf.toString("utf-8"));
          return res.json(json);
        } catch {
          // fallthrough to raw
        }
      }
      return res.send(buf);
    }

    // Fallback mock when no external URL configured
    const types = ["recyclable", "biodegradable", "hazardous"] as const;
    const pick = types[Math.floor(Math.random() * types.length)];
    const confidence = Math.round((0.8 + Math.random() * 0.2) * 100) / 100; // 0.80 - 1.00
    const processingTime = 100 + Math.floor(Math.random() * 200);

    res.json({ class: pick, confidence, processingTime });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "prediction failed" });
  }
};
