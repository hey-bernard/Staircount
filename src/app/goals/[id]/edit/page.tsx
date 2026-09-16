import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GoalForm from "@/components/GoalForm";
import { updateGoal } from "../../actions";

export default async function EditGoalPage(props: PageProps<"/goals/[id]/edit">) {
  const { id } = await props.params;
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) notFound();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">목표 수정</h1>
      <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
        <GoalForm
          action={updateGoal}
          submitLabel="저장"
          values={{
            id: goal.id,
            title: goal.title,
            category: goal.category,
            description: goal.description,
            targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
            status: goal.status,
          }}
        />
      </div>
    </div>
  );
}
