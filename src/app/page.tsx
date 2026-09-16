import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  GOAL_CATEGORY_LABELS,
  WORKOUT_CATEGORY_LABELS,
  type GoalCategory,
  type WorkoutCategory,
} from "@/lib/constants";
import { formatDateTime, formatWorkoutSummary } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [recentWorkouts, activeGoals, weeklyCount, totalCount] = await Promise.all([
    prisma.workoutLog.findMany({ orderBy: { performedAt: "desc" }, take: 5 }),
    prisma.goal.findMany({ where: { status: "active" }, orderBy: { createdAt: "desc" } }),
    prisma.workoutLog.count({ where: { performedAt: { gte: sevenDaysAgo } } }),
    prisma.workoutLog.count(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-black/10 bg-black/[0.02] p-6 dark:border-white/10 dark:bg-white/[0.03]">
        <h1 className="text-xl font-semibold">안녕하세요 👋</h1>
        <p className="mt-1 text-sm text-foreground/70">
          운동을 자유롭게 기록하고, AI 코치에게 목표에 맞는 운동 가이드를
          받아보세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/workouts"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            운동 기록하기
          </Link>
          <Link
            href="/coach"
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            AI 코치와 대화하기
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-black/10 p-4 text-center dark:border-white/10">
          <p className="text-2xl font-semibold">{weeklyCount}</p>
          <p className="text-xs text-foreground/60">최근 7일 운동 횟수</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4 text-center dark:border-white/10">
          <p className="text-2xl font-semibold">{totalCount}</p>
          <p className="text-xs text-foreground/60">총 누적 기록</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4 text-center dark:border-white/10">
          <p className="text-2xl font-semibold">{activeGoals.length}</p>
          <p className="text-xs text-foreground/60">진행 중인 목표</p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">진행 중인 목표</h2>
          <Link href="/goals" className="text-sm text-foreground/60 hover:underline">
            전체 보기
          </Link>
        </div>
        {activeGoals.length === 0 ? (
          <p className="text-sm text-foreground/60">
            아직 설정한 목표가 없어요.{" "}
            <Link href="/goals" className="underline">
              목표를 추가
            </Link>
            하면 AI 코치가 더 정확한 가이드를 드릴 수 있어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeGoals.map((goal) => (
              <li
                key={goal.id}
                className="rounded-lg border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <span className="font-medium">{goal.title}</span>
                <span className="ml-2 text-xs text-foreground/60">
                  {GOAL_CATEGORY_LABELS[goal.category as GoalCategory] ??
                    goal.category}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">최근 운동</h2>
          <Link href="/workouts" className="text-sm text-foreground/60 hover:underline">
            전체 보기
          </Link>
        </div>
        {recentWorkouts.length === 0 ? (
          <p className="text-sm text-foreground/60">
            아직 기록된 운동이 없어요. 첫 운동을 기록해보세요!
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentWorkouts.map((log) => (
              <li
                key={log.id}
                className="rounded-lg border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{log.exerciseName}</span>
                  <span className="text-xs text-foreground/60">
                    {WORKOUT_CATEGORY_LABELS[log.category as WorkoutCategory] ??
                      log.category}
                  </span>
                </div>
                <p className="text-xs text-foreground/60">
                  {formatDateTime(log.performedAt)}
                  {formatWorkoutSummary(log) && ` · ${formatWorkoutSummary(log)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
