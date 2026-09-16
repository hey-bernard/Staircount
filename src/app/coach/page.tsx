import { prisma } from "@/lib/prisma";
import ChatPanel from "@/components/ChatPanel";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const messages = await prisma.coachMessage.findMany({
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <h1 className="mb-3 text-xl font-semibold">AI 운동 코치</h1>
      <p className="mb-4 text-sm text-foreground/60">
        운동 목표와 최근 기록을 바탕으로 맞춤 운동 가이드를 제공합니다. 자유롭게
        질문하거나 오늘 한 운동을 이야기해보세요.
      </p>
      <ChatPanel
        initialMessages={messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))}
      />
    </div>
  );
}
