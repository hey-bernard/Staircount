"use client";

import { useEffect, useId, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "제 운동 기록을 보고 이번 주 루틴을 짜줘",
  "목표에 맞게 오늘 뭘 하면 좋을지 추천해줘",
  "오늘 스쿼트 3세트 10회 60kg 했어",
];

export default function ChatPanel({
  initialMessages,
}: {
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();
  const localIdCounter = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const optimisticUserMessage: Message = {
      id: `local-${instanceId}-${localIdCounter.current++}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "요청에 실패했습니다.");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: data.message.id as string,
          role: "assistant",
          content: data.message.content as string,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-foreground/60">
            <p>AI 코치에게 첫 메시지를 보내보세요.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-black/5 px-3 py-2 text-sm text-foreground/50 dark:bg-white/10">
                코치가 생각하는 중...
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex gap-2 border-t border-black/10 p-3 dark:border-white/10"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          disabled={isLoading}
          className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          보내기
        </button>
      </form>
    </div>
  );
}
