import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/supabase";
import { listMessages, sendMessage, Message } from "@/lib/messages";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAIReply } from "@/lib/ai-chat";

export default function MessagesPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const pickupId = params.get("pickupId") || undefined;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const data = await listMessages({ pickup_id: pickupId, user_id: user?.id });
    setMessages(data);
    setTimeout(
      () =>
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: "smooth",
        }),
      0,
    );
  };

  useEffect(() => {
    load();
  }, [pickupId]);

  const onSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    await sendMessage({
      pickup_id: pickupId,
      from_user_id: user?.id || "mock-user-1",
      to_user_id: "worker-bot",
      body: content,
    });
    setText("");
    await load();
    // Get AI worker auto-reply
    const context = pickupId ? `Pickup ID: ${pickupId}.` : undefined;
    const reply = await getAIReply(content, context);
    if (reply) {
      await sendMessage({
        pickup_id: pickupId,
        from_user_id: "worker-bot",
        to_user_id: user?.id || "mock-user-1",
        body: reply,
      });
      await load();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="h-[70vh] flex flex-col">
        <CardHeader>
          <CardTitle>
            Messages {pickupId ? `(Pickup ${pickupId})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto space-y-2 p-2 bg-slate-800/30 rounded"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[70%] p-2 rounded ${m.from_user_id === (user?.id || "mock-user-1") ? "ml-auto bg-green-600 text-white" : "mr-auto bg-slate-700 text-white"}`}
              >
                <div className="text-sm">{m.body}</div>
                <div className="text-[10px] opacity-70">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSend();
                }
              }}
            />
            <Button onClick={onSend}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
