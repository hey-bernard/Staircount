import { WORKOUT_CATEGORIES, WORKOUT_CATEGORY_LABELS } from "@/lib/constants";

type WorkoutFormValues = {
  id?: string;
  performedAt?: string;
  exerciseName?: string;
  category?: string;
  sets?: number | null;
  reps?: number | null;
  weightKg?: number | null;
  durationMin?: number | null;
  distanceKm?: number | null;
  calories?: number | null;
  rpe?: number | null;
  notes?: string | null;
};

function toDateTimeLocal(value?: string): string {
  const date = value ? new Date(value) : new Date();
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function WorkoutForm({
  action,
  values,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  values?: WorkoutFormValues;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {values?.id && <input type="hidden" name="id" defaultValue={values.id} />}

      <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-1">
        운동 일시
        <input
          type="datetime-local"
          name="performedAt"
          defaultValue={toDateTimeLocal(values?.performedAt)}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
          required
        />
      </label>

      <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-1">
        운동 종류
        <input
          type="text"
          name="exerciseName"
          defaultValue={values?.exerciseName}
          placeholder="예: 스쿼트, 러닝"
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
          required
        />
      </label>

      <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-1">
        카테고리
        <select
          name="category"
          defaultValue={values?.category ?? "strength"}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        >
          {WORKOUT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {WORKOUT_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        세트
        <input
          type="number"
          name="sets"
          min={1}
          defaultValue={values?.sets ?? undefined}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        횟수
        <input
          type="number"
          name="reps"
          min={1}
          defaultValue={values?.reps ?? undefined}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        무게 (kg)
        <input
          type="number"
          step="0.5"
          name="weightKg"
          min={0}
          defaultValue={values?.weightKg ?? undefined}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        시간 (분)
        <input
          type="number"
          step="0.5"
          name="durationMin"
          min={0}
          defaultValue={values?.durationMin ?? undefined}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        거리 (km)
        <input
          type="number"
          step="0.01"
          name="distanceKm"
          min={0}
          defaultValue={values?.distanceKm ?? undefined}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        칼로리
        <input
          type="number"
          name="calories"
          min={0}
          defaultValue={values?.calories ?? undefined}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        체감 강도 (RPE 1-10)
        <input
          type="number"
          name="rpe"
          min={1}
          max={10}
          defaultValue={values?.rpe ?? undefined}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        />
      </label>

      <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-4">
        메모
        <textarea
          name="notes"
          rows={2}
          defaultValue={values?.notes ?? undefined}
          placeholder="컨디션, 통증, 느낀 점 등 자유롭게 기록하세요"
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        />
      </label>

      <div className="col-span-2 sm:col-span-4">
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
