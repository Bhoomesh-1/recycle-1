import type { RequestHandler } from "express";

export const aiChatHandler: RequestHandler = async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
    }

    const { messages, system } = req.body as {
      messages: { role: "user" | "assistant" | "system"; content: string }[];
      system?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const finalMessages = [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      ...messages,
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: finalMessages,
        temperature: 0.3,
        max_tokens: 256,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res
        .status(500)
        .json({ error: "OpenAI request failed", details: text });
    }

    const data = (await resp.json()) as any;
    const reply: string = data?.choices?.[0]?.message?.content ?? "";
    return res.json({ reply });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Unknown error" });
  }
};
