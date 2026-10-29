// The play-records port over Kindling's API, through the generated client.
import { sendPlayRecords } from "@repo/api-client";
import type { PlayRecordsPort } from "../ports.ts";
import { unexpected } from "./unexpected.ts";

export function apiRecords(
  options: {
    /** Where a batch the API will never accept is reported. */
    onRefused?: (status: number, error: unknown) => void;
  } = {},
): PlayRecordsPort {
  const onRefused =
    options.onRefused ??
    ((status, error) =>
      console.error(`[play] The API refused play records (${status})`, error));
  return {
    async send(batch) {
      if (batch.length === 0) return;
      // Network errors reject from here, so the batch is retried.
      const res = await sendPlayRecords([...batch]);
      const status = res.status as number;
      if (status >= 200 && status < 300) return;
      // Retrying a 4xx can't help (except 429, too many requests): drop the batch.
      if (status >= 400 && status < 500 && status !== 429)
        return onRefused(status, res.data);
      throw unexpected("play records", status);
    },
  };
}
