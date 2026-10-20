"use server";

import type { FormResult } from "@repo/ui/marketing/form-action";

/** Lets the design page show form success states without sending anything. */
export async function demoSubmit(): Promise<FormResult> {
  return { ok: true, message: "Demo only: nothing was sent." };
}
