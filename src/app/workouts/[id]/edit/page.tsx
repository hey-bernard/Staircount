import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import WorkoutForm from "@/components/WorkoutForm";
import { updateWorkout } from "../../actions";

export default async function EditWorkoutPage(
  props: PageProps<"/workouts/[id]/edit">,
) {
  const { id } = await props.params;
  const log = await prisma.workoutLog.findUnique({ where: { id } });
  if (!log) notFound();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">운동 기록 수정</h1>
      <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
        <WorkoutForm
          action={updateWorkout}
          submitLabel="저장"
          values={{
            id: log.id,
            performedAt: log.performedAt.toISOString(),
            exerciseName: log.exerciseName,
            category: log.category,
            sets: log.sets,
            reps: log.reps,
            weightKg: log.weightKg,
            durationMin: log.durationMin,
            distanceKm: log.distanceKm,
            calories: log.calories,
            rpe: log.rpe,
            notes: log.notes,
          }}
        />
      </div>
    </div>
  );
}
