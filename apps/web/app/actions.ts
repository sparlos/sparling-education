"use server";

import type { FormResult } from "@repo/ui/marketing/form-action";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INVALID_EMAIL: FormResult = {
  ok: false,
  message: "Please enter a valid email address.",
};

function readEmail(formData: FormData): string | null {
  const email = String(formData.get("email") ?? "").trim();
  return EMAIL.test(email) ? email : null;
}

// Where signups are stored is still undecided; until then they are only
// logged. Replace the console calls with the real destination.

export async function joinPilot(formData: FormData): Promise<FormResult> {
  const email = readEmail(formData);
  const grade = String(formData.get("grade") ?? "").trim();
  if (!email) {
    return INVALID_EMAIL;
  }
  if (!grade) {
    return { ok: false, message: "Please choose the grade you teach." };
  }
  console.info("[pilot signup]", { email, grade });
  return {
    ok: true,
    message: "You're on the list! We'll be in touch about the pilot soon.",
  };
}

export async function subscribeUpdates(
  formData: FormData,
): Promise<FormResult> {
  const email = readEmail(formData);
  if (!email) {
    return INVALID_EMAIL;
  }
  console.info("[updates signup]", {
    email,
    audience: formData.get("audience"),
  });
  return { ok: true, message: "Thanks! We'll send you the occasional update." };
}
