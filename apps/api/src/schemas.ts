import { z } from "@hono/zod-openapi";

export const HealthSchema = z
  .object({ status: z.literal("ok") })
  .openapi("Health");

export type Health = z.infer<typeof HealthSchema>;
