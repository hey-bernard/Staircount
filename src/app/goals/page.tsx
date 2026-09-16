import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createGoal, deleteGoal, setGoalStatus } from "./actions";
import GoalForm from "@/components/GoalForm";
import {
  GOAL_CATEGORY_LABELS,
  GOAL_STATUS_LABELS,
  type GoalCategory,
  type GoalStatus,
} from "@/lib/constants";
import { formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await prisma.goal.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">목표 설정하기</h1>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <GoalForm action={createGoal} submitLabel="목표 추가" />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">내 목표 ({goals.length}개)</h2>
        {goals.length === 0 ? (
          <p className="text-sm text-foreground/60">
            아직 설정한 목표가 없습니다. AI 코치가 맞춤 가이드를 드리려면 목표를
            먼저 등록해주세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{goal.title}</span>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-foreground/70 dark:bg-white/10">
                      {GOAL_CATEGORY_LABELS[goal.category as GoalCategory] ??
                        goal.category}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        goal.status === "achieved"
                          ? "bg-green-500/15 text-green-700 dark:text-green-400"
                          : goal.status === "abandoned"
                            ? "bg-black/5 text-foreground/50 dark:bg-white/10"
                            : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {GOAL_STATUS_LABELS[goal.status as GoalStatus] ?? goal.status}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2 text-sm">
                    <Link
                      href={`/goals/${goal.id}/edit`}
                      className="rounded-md border border-black/15 px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                    >
                      수정
                    </Link>
                    {goal.status !== "achieved" && (
                      <form action={setGoalStatus}>
                        <input type="hidden" name="id" value={goal.id} />
                        <input type="hidden" name="status" value="achieved" />
                        <button
                          type="submit"
                          className="rounded-md border border-black/15 px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                        >
                          달성 완료
                        </button>
                      </form>
                    )}
                    <form action={deleteGoal}>
                      <input type="hidden" name="id" value={goal.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-black/15 px-3 py-1 text-red-600 hover:bg-red-500/10 dark:border-white/20"
                      >
                        삭제
                      </button>
                    </form>
                  </div>
                </div>
                {goal.targetDate && (
                  <p className="text-sm text-foreground/60">
                    목표일: {formatShortDate(goal.targetDate)}
                  </p>
                )}
                {goal.description && (
                  <p className="text-sm text-foreground/80">{goal.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
