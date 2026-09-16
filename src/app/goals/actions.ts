"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { goalInputSchema } from "@/lib/validation";

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const trimmed = value.toString().trim();
  return trimmed === "" ? null : trimmed;
}

function parseGoalForm(formData: FormData) {
  return goalInputSchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: emptyToNull(formData.get("description")),
    targetDate: emptyToNull(formData.get("targetDate")),
    status: formData.get("status") ?? "active",
  });
}

export async function createGoal(formData: FormData) {
  const data = parseGoalForm(formData);
  await prisma.goal.create({ data });
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function updateGoal(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) throw new Error("Missing goal id");
  const data = parseGoalForm(formData);
  await prisma.goal.update({ where: { id }, data });
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function setGoalStatus(formData: FormData) {
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || !id) throw new Error("Missing goal id");
  if (typeof status !== "string") throw new Error("Missing status");
  await prisma.goal.update({ where: { id }, data: { status } });
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function deleteGoal(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) throw new Error("Missing goal id");
  await prisma.goal.delete({ where: { id } });
  revalidatePath("/goals");
  revalidatePath("/");
}
