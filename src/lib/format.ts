const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
});

export function formatDateTime(value: Date | string): string {
  return dateFormatter.format(new Date(value));
}

export function formatShortDate(value: Date | string): string {
  return shortDateFormatter.format(new Date(value));
}

export function formatWorkoutSummary(log: {
  sets?: number | null;
  reps?: number | null;
  weightKg?: number | null;
  durationMin?: number | null;
  distanceKm?: number | null;
  calories?: number | null;
  rpe?: number | null;
}): string {
  const parts: string[] = [];
  if (log.sets && log.reps) {
    parts.push(
      `${log.sets}세트 x ${log.reps}회${log.weightKg ? ` @ ${log.weightKg}kg` : ""}`,
    );
  }
  if (log.durationMin) parts.push(`${log.durationMin}분`);
  if (log.distanceKm) parts.push(`${log.distanceKm}km`);
  if (log.calories) parts.push(`${log.calories}kcal`);
  if (log.rpe) parts.push(`RPE ${log.rpe}`);
  return parts.join(" · ");
}
