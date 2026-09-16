import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runCoachAgent } from "@/lib/agent";

const HISTORY_LIMIT = 20;

const requestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

export async function GET() {
  const messages = await prisma.coachMessage.findMany({
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { message } = parsed.data;

  await prisma.coachMessage.create({
    data: { role: "user", content: message },
  });

  const recent = await prisma.coachMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  const history = recent
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let reply: string;
  try {
    reply = await runCoachAgent(history);
  } catch (error) {
    console.error("Coach agent error", error);
    return NextResponse.json(
      { error: "AI 코치 응답 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }

  const saved = await prisma.coachMessage.create({
    data: { role: "assistant", content: reply },
  });

  return NextResponse.json({ message: saved });
}
