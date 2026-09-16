import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createWorkout, deleteWorkout } from "./actions";
import WorkoutForm from "@/components/WorkoutForm";
import { WORKOUT_CATEGORY_LABELS, type WorkoutCategory } from "@/lib/constants";
import { formatDateTime, formatWorkoutSummary } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const logs = await prisma.workoutLog.findMany({
    orderBy: { performedAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">운동 기록하기</h1>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <WorkoutForm action={createWorkout} submitLabel="기록 추가" />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          운동 히스토리 ({logs.length}개)
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-foreground/60">
            아직 기록된 운동이 없습니다. 위 양식으로 첫 운동을 기록해보세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{log.exerciseName}</span>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-foreground/70 dark:bg-white/10">
                      {WORKOUT_CATEGORY_LABELS[log.category as WorkoutCategory] ??
                        log.category}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/60">
                    {formatDateTime(log.performedAt)}
                    {formatWorkoutSummary(log) && ` · ${formatWorkoutSummary(log)}`}
                  </p>
                  {log.notes && (
                    <p className="mt-1 text-sm text-foreground/80">{log.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <Link
                    href={`/workouts/${log.id}/edit`}
                    className="rounded-md border border-black/15 px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    수정
                  </Link>
                  <form action={deleteWorkout}>
                    <input type="hidden" name="id" value={log.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-black/15 px-3 py-1 text-red-600 hover:bg-red-500/10 dark:border-white/20"
                    >
                      삭제
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
