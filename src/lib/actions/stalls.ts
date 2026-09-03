"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateStallCode } from "@/lib/id-generators";
import type { ActionState } from "@/lib/actions/categories";

export async function createStall(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Stall name is required." };

  const location = String(formData.get("location") ?? "").trim();
  const mallName = String(formData.get("mallName") ?? "").trim();
  const eventName = String(formData.get("eventName") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const status = String(formData.get("status") ?? "UPCOMING");
  const notes = String(formData.get("notes") ?? "").trim();

  const stallCode = await generateStallCode();

  await prisma.stall.create({
    data: {
      stallCode,
      name,
      location: location || null,
      mallName: mallName || null,
      eventName: eventName || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: status as never,
      notes: notes || null,
    },
  });

  revalidatePath("/stalls");
  redirect("/stalls");
}

export async function updateStall(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Stall name is required." };

  const location = String(formData.get("location") ?? "").trim();
  const mallName = String(formData.get("mallName") ?? "").trim();
  const eventName = String(formData.get("eventName") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const status = String(formData.get("status") ?? "UPCOMING");
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.stall.update({
    where: { id },
    data: {
      name,
      location: location || null,
      mallName: mallName || null,
      eventName: eventName || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: status as never,
      notes: notes || null,
    },
  });

  revalidatePath("/stalls");
  redirect("/stalls");
}
