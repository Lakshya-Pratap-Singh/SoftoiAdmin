"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, TextInput, Select, Textarea, SubmitButton, SecondaryButton } from "@/components/ui/form";
import type { ActionState } from "@/lib/actions/categories";

export function StallForm({
  action,
  defaults,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: {
    name?: string;
    location?: string;
    mallName?: string;
    eventName?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    notes?: string;
  };
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4 rounded-lg border border-border bg-surface p-6">
      <Field label="Stall name" htmlFor="name" required>
        <TextInput id="name" name="name" required defaultValue={defaults?.name} placeholder="e.g. Softoi Festival Stall" />
      </Field>
      <Field label="Location" htmlFor="location">
        <TextInput id="location" name="location" defaultValue={defaults?.location} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Mall name" htmlFor="mallName">
          <TextInput id="mallName" name="mallName" defaultValue={defaults?.mallName} />
        </Field>
        <Field label="Event name" htmlFor="eventName">
          <TextInput id="eventName" name="eventName" defaultValue={defaults?.eventName} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" htmlFor="startDate">
          <TextInput id="startDate" name="startDate" type="date" defaultValue={defaults?.startDate} />
        </Field>
        <Field label="End date" htmlFor="endDate">
          <TextInput id="endDate" name="endDate" type="date" defaultValue={defaults?.endDate} />
        </Field>
      </div>
      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={defaults?.status ?? "UPCOMING"}>
          <option value="UPCOMING">Upcoming</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </Field>
      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaults?.notes} />
      </Field>

      {state?.error && (
        <p role="alert" className="rounded-md bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}

      <div className="mt-2 flex gap-2">
        <SubmitButton>{defaults ? "Save Changes" : "Add Stall"}</SubmitButton>
        <Link href="/stalls">
          <SecondaryButton type="button">Cancel</SecondaryButton>
        </Link>
      </div>
    </form>
  );
}
