export const WORKOUT_CATEGORIES = [
  "strength",
  "cardio",
  "flexibility",
  "sports",
  "other",
] as const;

export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number];

export const WORKOUT_CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  strength: "근력 운동",
  cardio: "유산소",
  flexibility: "스트레칭/유연성",
  sports: "스포츠",
  other: "기타",
};

export const GOAL_CATEGORIES = [
  "strength",
  "weight_loss",
  "endurance",
  "muscle_gain",
  "general_health",
  "custom",
] as const;

export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  strength: "근력 향상",
  weight_loss: "체중 감량",
  endurance: "지구력 향상",
  muscle_gain: "근육량 증가",
  general_health: "전반적 건강",
  custom: "custom",
};

export const GOAL_STATUSES = ["active", "achieved", "abandoned"] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: "진행 중",
  achieved: "달성",
  abandoned: "중단",
};
