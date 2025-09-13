import { app } from "@/lib/config";

export async function getAIReply(
  userText: string,
  context?: string,
): Promise<string> {
  const body = {
    system:
      context ||
      "You are a helpful collection agent assisting with waste pickups and marketplace orders. Keep replies short and professional.",
    messages: [{ role: "user" as const, content: userText }],
  };
  const resp = await fetch(`/api/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.warn("AI chat failed", txt);
    return "";
  }
  const data = await resp.json();
  return data.reply || "";
}
