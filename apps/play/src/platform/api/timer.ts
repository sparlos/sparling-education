// The timer port over the platform's API, through the generated client.
import { getStudentTimer } from "@repo/api-client";
import type { TimerPort } from "../ports.ts";
import { unexpected } from "./unexpected.ts";

export function apiTimer(): TimerPort {
  return {
    async current() {
      const res = await getStudentTimer();
      if (res.status !== 200) throw unexpected("timer", res.status);
      return res.data;
    },
  };
}
