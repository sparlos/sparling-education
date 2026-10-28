import { z } from "@hono/zod-openapi";

export const HealthSchema = z
  .object({ status: z.literal("ok") })
  .openapi("Health");

export type Health = z.infer<typeof HealthSchema>;

export const UnhealthySchema = z
  .object({ status: z.literal("unavailable") })
  .openapi("Unhealthy");

export const AccountSchema = z
  .object({
    id: z.string().openapi({ description: "Stable and opaque" }),
    role: z.enum(["teacher", "student"]),
    firstName: z.string(),
    lastInitial: z.string(),
  })
  .openapi("Account");

export type Account = z.infer<typeof AccountSchema>;

export const SignInSchema = z
  .object({
    credential: z
      .string()
      .min(1)
      .openapi({ description: "The ID token from Google sign-in" }),
    as: z.enum(["teacher"]).openapi({
      description:
        "The entry point. A new Google account gets this role; an existing one keeps its own.",
    }),
    returnTo: z.string().optional().openapi({
      description:
        "Where to go once signed in. Only a path on this domain is followed.",
      example: "/teach/",
    }),
  })
  .openapi("SignIn");

export const SignedInSchema = z
  .object({
    account: AccountSchema,
    returnTo: z
      .string()
      .openapi({ description: "A same-origin path to go to now" }),
  })
  .openapi("SignedIn");

export const ErrorSchema = z.object({ error: z.string() }).openapi("Error");

export const NewClassSchema = z
  .object({
    name: z.string().trim().min(1).max(60).openapi({ example: "Room 12" }),
    grades: z
      .array(z.union([z.literal(3), z.literal(4), z.literal(5)]))
      .min(1)
      .openapi({
        description: "The class's grade, or grades for a split class",
        example: [4, 5],
      }),
  })
  .openapi("NewClass");

export type NewClass = z.infer<typeof NewClassSchema>;

export const ClassGameSchema = z
  .object({
    slug: z.string().openapi({ example: "fraction-hop" }),
    name: z.string().openapi({ example: "Fraction Hop" }),
    on: z.boolean().openapi({ description: "Whether students see it" }),
    path: z.string().openapi({
      description: "The game link for this class, as a path on this domain",
      example: "/play/fraction-hop?join=K7QM4XRT",
    }),
  })
  .openapi("ClassGame");

export const ClassSchema = z
  .object({
    id: z.string().openapi({ description: "Stable and opaque" }),
    name: z.string(),
    grades: z.array(z.number().int()).openapi({ description: "Ascending" }),
    joinCode: z.string().openapi({ example: "K7QM4XRT" }),
    joinPath: z.string().openapi({
      description: "The class join link, as a path on this domain",
      example: "/play/join/K7QM4XRT",
    }),
    games: z.array(ClassGameSchema).openapi({
      description: "Every game Kindling hosts, and whether it's on",
    }),
  })
  .openapi("Class");

export type Class = z.infer<typeof ClassSchema>;
