import type { RequestHandler } from "express";

export const aiChatHandler: RequestHandler = async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    const { messages, system } = req.body as {
      messages: { role: "user" | "assistant" | "system"; content: string }[];
      system?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // If no API key, or external call fails, fall back to a simple deterministic reply
    const makeFallback = () => {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const userText = (lastUser?.content || "").trim();
      const ctx = (system || "").trim();
      const snippet =
        userText.length > 140 ? userText.slice(0, 140) + "…" : userText;
      const prefix = ctx ? "Thanks for the update. " : "Thanks. ";
      const tail =
        "We'll handle this shortly and keep you posted. If anything changes, reply here.";
      return `${prefix}${snippet ? `Regarding: "${snippet}". ` : ""}${tail}`;
    };

    if (!apiKey) {
      return res.json({ reply: makeFallback() });
    }

    const finalMessages = [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      ...messages,
    ];

    try {
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
        console.warn("OpenAI request failed:", text);
        return res.json({ reply: makeFallback() });
      }

      const data = (await resp.json()) as any;
      const reply: string = data?.choices?.[0]?.message?.content ?? "";
      return res.json({ reply: reply || makeFallback() });
    } catch (e) {
      console.warn(
        "OpenAI call error, using fallback:",
        (e as any)?.message || e,
      );
      return res.json({ reply: makeFallback() });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Unknown error" });
  }
};
