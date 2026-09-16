import { z } from "zod";
import { GOAL_CATEGORIES, GOAL_STATUSES, WORKOUT_CATEGORIES } from "./constants";

export const workoutInputSchema = z.object({
  performedAt: z.coerce.date(),
  exerciseName: z.string().trim().min(1, "운동 이름을 입력해주세요").max(120),
  category: z.enum(WORKOUT_CATEGORIES),
  sets: z.coerce.number().int().positive().max(200).optional().nullable(),
  reps: z.coerce.number().int().positive().max(2000).optional().nullable(),
  weightKg: z.coerce.number().nonnegative().max(2000).optional().nullable(),
  durationMin: z.coerce.number().positive().max(1440).optional().nullable(),
  distanceKm: z.coerce.number().positive().max(1000).optional().nullable(),
  calories: z.coerce.number().positive().max(20000).optional().nullable(),
  rpe: z.coerce.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type WorkoutInput = z.infer<typeof workoutInputSchema>;

export const goalInputSchema = z.object({
  title: z.string().trim().min(1, "목표 제목을 입력해주세요").max(120),
  category: z.enum(GOAL_CATEGORIES),
  description: z.string().trim().max(2000).optional().nullable(),
  targetDate: z.coerce.date().optional().nullable(),
  status: z.enum(GOAL_STATUSES).default("active"),
});

export type GoalInput = z.infer<typeof goalInputSchema>;
