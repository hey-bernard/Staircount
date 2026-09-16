import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { goalInputSchema, workoutInputSchema } from "@/lib/validation";
import { GOAL_STATUSES, WORKOUT_CATEGORIES } from "@/lib/constants";

const client = new Anthropic();

const COACH_MODEL = "claude-opus-5";

const SYSTEM_PROMPT = `당신은 사용자 전용 AI 운동 코치입니다. 사용자가 자유롭게 기록한 운동 일지와 설정한 목표를 근거로, 개인 맞춤형 운동 가이드를 제공하는 것이 당신의 역할입니다.

원칙:
- 조언을 하기 전에 반드시 도구를 사용해 사용자의 실제 운동 기록(get_recent_workouts 또는 get_workout_stats)과 목표(get_goals)를 확인하세요. 추측하지 말고 데이터에 근거하세요.
- 기록이 거의 없다면 그 사실을 알리고, 우선 운동 기록을 시작하도록 안내하거나 최소한의 정보(운동 경험, 가용 시간, 장비 등)를 되물어보세요.
- 답변은 한국어로, 명확한 소제목과 목록을 사용해 실행 가능한 형태로 작성하세요 (예: 이번 주 추천 루틴, 세트/횟수/강도, 주의사항, 휴식일 등).
- 과도한 훈련량 증가나 부상 위험이 있는 조언은 피하고, 점진적 과부하 원칙과 회복의 중요성을 반영하세요. 통증이나 부상이 언급되면 전문가(의사, 물리치료사) 상담을 권하세요.
- 사용자가 대화 중에 방금 완료한 운동을 이야기하면(예: "오늘 스쿼트 3세트 10회 60kg 했어"), log_workout 도구로 기록해도 되는지 자연스럽게 반영해 기록하고 무엇을 기록했는지 확인해주세요. 애매하면 먼저 확인 질문을 하세요.
- 사용자가 새로운 목표를 이야기하면 create_goal 도구로 목표를 만들 수 있습니다. 만든 후에는 만든 목표를 요약해서 알려주세요.
- 목표가 여러 개면 우선순위를 함께 논의하세요.
- 과장하지 말고, 구체적이고 실천 가능한 조언을 우선하세요.`;

const recentWorkoutsTool = betaZodTool({
  name: "get_recent_workouts",
  description:
    "최근 N일간 사용자가 기록한 운동 일지를 최신순으로 가져옵니다. 구체적인 운동 종류, 세트/횟수/무게, 시간, 거리, RPE, 메모를 포함합니다.",
  inputSchema: z.object({
    days: z
      .number()
      .int()
      .min(1)
      .max(365)
      .default(30)
      .describe("조회할 최근 일수 (기본 30일)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe("최대 반환 개수 (기본 50개)"),
  }),
  run: async (input) => {
    const since = new Date();
    since.setDate(since.getDate() - input.days);
    const logs = await prisma.workoutLog.findMany({
      where: { performedAt: { gte: since } },
      orderBy: { performedAt: "desc" },
      take: input.limit,
    });
    return JSON.stringify(logs);
  },
});

const workoutStatsTool = betaZodTool({
  name: "get_workout_stats",
  description:
    "최근 N일간 운동 기록을 집계한 통계를 반환합니다: 총 운동 횟수, 카테고리별 횟수, 운동 종목별 횟수와 총 볼륨(세트*횟수*무게), 평균 RPE. 전반적인 추세를 파악할 때 사용하세요.",
  inputSchema: z.object({
    days: z.number().int().min(1).max(365).default(30),
  }),
  run: async (input) => {
    const since = new Date();
    since.setDate(since.getDate() - input.days);
    const logs = await prisma.workoutLog.findMany({
      where: { performedAt: { gte: since } },
      orderBy: { performedAt: "desc" },
    });

    const byCategory: Record<string, number> = {};
    const byExercise: Record<string, { count: number; totalVolume: number }> = {};
    let rpeSum = 0;
    let rpeCount = 0;

    for (const log of logs) {
      byCategory[log.category] = (byCategory[log.category] ?? 0) + 1;
      const key = log.exerciseName;
      if (!byExercise[key]) byExercise[key] = { count: 0, totalVolume: 0 };
      byExercise[key].count += 1;
      if (log.sets && log.reps && log.weightKg) {
        byExercise[key].totalVolume += log.sets * log.reps * log.weightKg;
      }
      if (log.rpe) {
        rpeSum += log.rpe;
        rpeCount += 1;
      }
    }

    return JSON.stringify({
      windowDays: input.days,
      totalSessions: logs.length,
      byCategory,
      byExercise,
      averageRpe: rpeCount > 0 ? Number((rpeSum / rpeCount).toFixed(1)) : null,
      firstSessionDate: logs.at(-1)?.performedAt ?? null,
      lastSessionDate: logs.at(0)?.performedAt ?? null,
    });
  },
});

const getGoalsTool = betaZodTool({
  name: "get_goals",
  description: "사용자가 설정한 운동 목표 목록을 가져옵니다.",
  inputSchema: z.object({
    status: z
      .enum(GOAL_STATUSES)
      .optional()
      .describe("상태로 필터링 (active/achieved/abandoned). 생략하면 전체 반환"),
  }),
  run: async (input) => {
    const goals = await prisma.goal.findMany({
      where: input.status ? { status: input.status } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return JSON.stringify(goals);
  },
});

const logWorkoutTool = betaZodTool({
  name: "log_workout",
  description:
    "사용자가 대화 중 언급한, 실제로 수행한 운동을 운동 일지에 기록합니다. 사용자가 방금 한 운동을 분명히 설명했을 때만 사용하세요.",
  inputSchema: z.object({
    performedAt: z
      .string()
      .datetime()
      .optional()
      .describe("운동을 수행한 시각(ISO 8601). 생략하면 지금으로 기록"),
    exerciseName: z.string().min(1).max(120),
    category: z.enum(WORKOUT_CATEGORIES),
    sets: z.number().int().positive().max(200).optional(),
    reps: z.number().int().positive().max(2000).optional(),
    weightKg: z.number().nonnegative().max(2000).optional(),
    durationMin: z.number().positive().max(1440).optional(),
    distanceKm: z.number().positive().max(1000).optional(),
    calories: z.number().positive().max(20000).optional(),
    rpe: z.number().int().min(1).max(10).optional(),
    notes: z.string().max(2000).optional(),
  }),
  run: async (input) => {
    const parsed = workoutInputSchema.parse({
      ...input,
      performedAt: input.performedAt ?? new Date(),
    });
    const created = await prisma.workoutLog.create({ data: parsed });
    return JSON.stringify({ logged: true, workout: created });
  },
});

const createGoalTool = betaZodTool({
  name: "create_goal",
  description: "사용자가 대화 중 이야기한 새로운 운동 목표를 생성합니다.",
  inputSchema: z.object({
    title: z.string().min(1).max(120),
    category: z.enum([
      "strength",
      "weight_loss",
      "endurance",
      "muscle_gain",
      "general_health",
      "custom",
    ]),
    description: z.string().max(2000).optional(),
    targetDate: z.string().datetime().optional(),
  }),
  run: async (input) => {
    const parsed = goalInputSchema.parse({
      ...input,
      status: "active",
    });
    const created = await prisma.goal.create({ data: parsed });
    return JSON.stringify({ created: true, goal: created });
  },
});

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function runCoachAgent(history: ChatTurn[]): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  const finalMessage = await client.beta.messages.toolRunner({
    model: COACH_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    tools: [
      recentWorkoutsTool,
      workoutStatsTool,
      getGoalsTool,
      logWorkoutTool,
      createGoalTool,
    ],
    messages,
  });

  const textBlocks = finalMessage.content.filter(
    (block): block is Anthropic.Beta.BetaTextBlock => block.type === "text",
  );

  const text = textBlocks.map((block) => block.text).join("\n\n").trim();

  if (text) return text;

  if (finalMessage.stop_reason === "refusal") {
    return "죄송하지만 이 요청에는 답변할 수 없습니다. 다른 방식으로 질문해주세요.";
  }

  return "죄송해요, 응답을 생성하지 못했습니다. 다시 시도해주세요.";
}
