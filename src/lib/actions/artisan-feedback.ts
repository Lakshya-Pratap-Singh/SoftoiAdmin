"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "@/lib/actions/categories";
import { AccessError } from "@/lib/artisan-feedback/access";
import { requireQRManager } from "@/lib/artisan-feedback/session";
import {
  FeedbackError,
  createQRsForOrder,
  disableQR,
  regenerateQR,
} from "@/lib/artisan-feedback/service";

// Every action re-checks the session itself: src/proxy.ts is only an
// optimistic redirect, and server actions can be called directly.

function fail(err: unknown, label: string): ActionState {
  if (err instanceof AccessError || err instanceof FeedbackError) return { error: err.message };
  console.error(`[artisan-feedback] ${label} failed:`, err);
  return { error: "Something went wrong. Please try again." };
}

/** ids come from bound arguments, but validate anyway — actions are public endpoints. */
function validId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[A-Za-z0-9_-]+$/.test(value);
}

/**
 * One click for a whole order: creates a QR for every line that can have one.
 * Lines whose product has no artisan get one from the `artisan_<itemId>`
 * dropdown in the same form. Lines that still can't be done are skipped and
 * stay visibly "not ready" on the page rather than blocking the rest.
 */
export async function generateQRsForOrderAction(
  orderId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireQRManager();
    if (!validId(orderId)) return { error: "Invalid order." };

    const artisanByItem: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("artisan_") || typeof value !== "string" || !value) continue;
      const itemId = key.slice("artisan_".length);
      if (validId(itemId) && validId(value)) artisanByItem[itemId] = value;
    }

    const results = await createQRsForOrder(prisma, { orderId, artisanByItem, createdById: user.id });
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/artisan-appreciation");
    revalidatePath("/artisan-appreciation/new");

    if (results.length > 0 && results.every((r) => r.outcome === "skipped")) {
      return { error: results[0].reason ?? "No QR codes could be created for this order." };
    }
    return undefined;
  } catch (err) {
    return fail(err, "generate");
  }
}

// _prev/_formData are required by the useActionState signature (see ActionForm) even though unused.
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function disableQRAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  try {
    await requireQRManager();
    if (!validId(id)) return { error: "Invalid QR code." };
    await disableQR(prisma, id);
  } catch (err) {
    return fail(err, "disable");
  }
  revalidatePath("/artisan-appreciation");
  revalidatePath(`/artisan-appreciation/${id}`);
  revalidatePath("/orders/[id]", "page");
  return undefined;
}

export async function regenerateQRAction(id: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  let newId: string;
  try {
    const user = await requireQRManager();
    if (!validId(id)) return { error: "Invalid QR code." };
    newId = (await regenerateQR(prisma, id, user.id)).id;
  } catch (err) {
    return fail(err, "regenerate");
  }
  revalidatePath("/artisan-appreciation");
  revalidatePath(`/artisan-appreciation/${id}`);
  revalidatePath("/orders/[id]", "page");
  redirect(`/artisan-appreciation/${newId}`); // outside try/catch: redirect() works by throwing
}
/* eslint-enable @typescript-eslint/no-unused-vars */
