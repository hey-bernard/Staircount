"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { workoutInputSchema } from "@/lib/validation";

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const trimmed = value.toString().trim();
  return trimmed === "" ? null : trimmed;
}

function parseWorkoutForm(formData: FormData) {
  return workoutInputSchema.parse({
    performedAt: emptyToNull(formData.get("performedAt")) ?? new Date(),
    exerciseName: formData.get("exerciseName"),
    category: formData.get("category"),
    sets: emptyToNull(formData.get("sets")),
    reps: emptyToNull(formData.get("reps")),
    weightKg: emptyToNull(formData.get("weightKg")),
    durationMin: emptyToNull(formData.get("durationMin")),
    distanceKm: emptyToNull(formData.get("distanceKm")),
    calories: emptyToNull(formData.get("calories")),
    rpe: emptyToNull(formData.get("rpe")),
    notes: emptyToNull(formData.get("notes")),
  });
}

export async function createWorkout(formData: FormData) {
  const data = parseWorkoutForm(formData);
  await prisma.workoutLog.create({ data });
  revalidatePath("/workouts");
  revalidatePath("/");
}

export async function updateWorkout(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) throw new Error("Missing workout id");
  const data = parseWorkoutForm(formData);
  await prisma.workoutLog.update({ where: { id }, data });
  revalidatePath("/workouts");
  revalidatePath("/");
}

export async function deleteWorkout(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) throw new Error("Missing workout id");
  await prisma.workoutLog.delete({ where: { id } });
  revalidatePath("/workouts");
  revalidatePath("/");
}
