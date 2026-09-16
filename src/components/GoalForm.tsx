import { GOAL_CATEGORIES, GOAL_CATEGORY_LABELS } from "@/lib/constants";

type GoalFormValues = {
  id?: string;
  title?: string;
  category?: string;
  description?: string | null;
  targetDate?: string | null;
  status?: string;
};

export default function GoalForm({
  action,
  values,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  values?: GoalFormValues;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      {values?.id && <input type="hidden" name="id" defaultValue={values.id} />}
      <input type="hidden" name="status" value={values?.status ?? "active"} />

      <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-1">
        목표 제목
        <input
          type="text"
          name="title"
          defaultValue={values?.title}
          placeholder="예: 3개월 내 체지방 5kg 감량"
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        카테고리
        <select
          name="category"
          defaultValue={values?.category ?? "general_health"}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        >
          {GOAL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {GOAL_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        목표 날짜 (선택)
        <input
          type="date"
          name="targetDate"
          defaultValue={values?.targetDate ? values.targetDate.slice(0, 10) : ""}
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        />
      </label>

      <label className="col-span-2 flex flex-col gap-1 text-sm">
        상세 설명 (선택)
        <textarea
          name="description"
          rows={2}
          defaultValue={values?.description ?? undefined}
          placeholder="목표에 대한 배경, 동기, 제약 조건 등을 적어주세요"
          className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
        />
      </label>

      <div className="col-span-2">
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
