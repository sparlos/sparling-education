import { z } from "@hono/zod-openapi";
import { itemsIn, type PartSlot } from "@repo/avatar/parts";

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

export const StudentSignInSchema = z
  .object({
    credential: z
      .string()
      .min(1)
      .openapi({ description: "The ID token from Google sign-in" }),
    g_csrf_token: z.string().min(1).openapi({
      description:
        "Google's double-submit token; must match the g_csrf_token cookie",
    }),
  })
  .openapi("StudentSignIn");

export const JoinSchema = z
  .object({
    joinCode: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .openapi({ description: "From the class join link or a game link" }),
  })
  .openapi("Join");

export const GradePickSchema = z
  .object({
    grade: z
      .number()
      .int()
      .openapi({ description: "One of the class's grades" }),
  })
  .openapi("GradePick");

export const LockerGameSchema = z
  .object({
    slug: z.string().openapi({ example: "fraction-hop" }),
    name: z.string().openapi({ example: "Fraction Hop" }),
  })
  .openapi("LockerGame");

export const MembershipSchema = z
  .object({
    classId: z.string().openapi({ description: "Stable and opaque" }),
    className: z.string(),
    grades: z
      .array(z.number().int())
      .openapi({ description: "The class's grades, ascending" }),
    grade: z.union([z.number().int(), z.null()]).openapi({
      description:
        "The student's grade in this class, which chooses their tier. Null until a student in a split class picks one",
    }),
    games: z
      .array(LockerGameSchema)
      .openapi({ description: "The class's games that are on" }),
  })
  .openapi("Membership");

export type Membership = z.infer<typeof MembershipSchema>;

/** One slot's item IDs, as an enum. */
const itemOf = <S extends PartSlot>(slot: S) =>
  z.enum(itemsIn(slot) as [ReturnType<typeof itemsIn<S>>[number]]);

export const LookSchema = z
  .object({
    body: itemOf("body").openapi({ description: "A skin tone" }),
    hair: itemOf("hair"),
    hat: z.union([itemOf("hat"), z.null()]).openapi({
      description: "Null for no hat",
    }),
    top: itemOf("top"),
    bottom: itemOf("bottom"),
    shoes: itemOf("shoes"),
  })
  .openapi("Look", {
    description:
      "An item ID for each slot of the avatar, from @repo/avatar. Outfit pieces (top, bottom, shoes, hat) must be ones the student owns.",
  });

export const LockerSchema = z
  .object({
    owned: z.array(z.string()).openapi({
      description:
        "The outfit pieces the student owns, as item IDs: the base set every student starts with, and their rewards. Skin tones and hair are always everyone's.",
    }),
  })
  .openapi("Locker");

export type Locker = z.infer<typeof LockerSchema>;

export const StudentSchema = z
  .object({
    id: z
      .string()
      .openapi({ description: "Stable and opaque; never an email or a name" }),
    locale: z.enum(["en-CA", "fr-CA"]),
    look: z.union([LookSchema, z.null()]).openapi({
      description:
        "Null until the student designs their avatar, which the play shell asks them to do first",
    }),
    classes: z.array(MembershipSchema).openapi({
      description: "The classes they're in, in the order they joined",
    }),
  })
  .openapi("Student");

export type Student = z.infer<typeof StudentSchema>;
