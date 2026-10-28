// The session port over Kindling's API, through the generated client.
import { getSession } from "@repo/api-client";
import { parseLook } from "@repo/avatar";
import { NotAStudent, type SessionPort } from "../ports.ts";
import { unexpected } from "./unexpected.ts";

export function apiSession(): SessionPort {
  return {
    async current() {
      const res = await getSession();
      if (res.status === 403) throw new NotAStudent();
      // The client's types only know the statuses the API documents.
      if (res.status !== 200)
        throw unexpected("session", (res as { status: number }).status);
      if (!res.data) return null;
      const { look, ...student } = res.data;
      // A look that isn't valid any more is designed again.
      return { ...student, look: look === null ? null : parseLook(look) };
    },
  };
}
