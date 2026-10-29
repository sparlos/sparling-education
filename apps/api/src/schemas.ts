import { z } from "@hono/zod-openapi";
import { itemsIn, type PartSlot } from "@repo/avatar/parts";
import { type LearningSkill, learningSkills } from "@repo/curriculum";
import { teacherTextMaxLength } from "@repo/game-contract";
import { recognitionTraits } from "@repo/rewards";

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

export const GameSwitchSchema = z
  .object({
    on: z.boolean().openapi({ description: "Whether students see the game" }),
  })
  .openapi("GameSwitch");

export const ClassStudentSchema = z
  .object({
    id: z.string().openapi({ description: "Stable and opaque" }),
    firstName: z.string(),
    lastInitial: z.string(),
    grade: z.union([z.number().int(), z.null()]).openapi({
      description:
        "Their grade in the class, which chooses their tier; null until picked in a split class",
    }),
  })
  .openapi("ClassStudent");

export type ClassStudent = z.infer<typeof ClassStudentSchema>;

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

export const PlacementSchema = z
  .object({
    sticker: z.string().max(100).openapi({
      description: "A sticker the student owns, from @repo/rewards",
      example: "sticker-star",
    }),
    x: z.number().min(0).max(1).openapi({
      description:
        "Where the sticker's centre is, across the locker: 0 is its left edge, 1 its right",
    }),
    y: z.number().min(0).max(1).openapi({
      description:
        "Where the sticker's centre is, down the locker: 0 is its top edge, 1 its bottom",
    }),
  })
  .openapi("Placement");

export const LockerSchema = z
  .object({
    owned: z.array(z.string()).openapi({
      description:
        "The outfit pieces the student owns, as item IDs: the base set every student starts with, and their rewards. Skin tones and hair are always everyone's.",
    }),
    stickers: z.array(z.string()).openapi({
      description:
        "The stickers the student owns, as sticker IDs from @repo/rewards: those they earned, in the order they were granted, then a recognition sticker for each trait a teacher recognised them for, in the order first given",
    }),
    unseen: z.array(z.string()).openapi({
      description:
        "Rewards (outfit pieces or stickers) the student hasn't seen revealed yet, in the order they were granted, then the recognition stickers for recognition they haven't seen",
    }),
    placements: z.array(PlacementSchema).openapi({
      description:
        "The stickers the student put on their locker, and where, the one underneath first",
    }),
  })
  .openapi("Locker");

export type Locker = z.infer<typeof LockerSchema>;

export const PlacementsSchema = z
  .object({
    placements: z
      .array(PlacementSchema)
      .max(500)
      .refine(
        (placements) =>
          new Set(placements.map((p) => p.sticker)).size === placements.length,
        { message: "Each sticker can be placed once" },
      )
      .openapi({
        description:
          "Every sticker on the locker, and where, the one underneath first. Stickers left out are taken off.",
      }),
  })
  .openapi("Placements");

export const SeenSchema = z
  .object({
    rewards: z
      .array(z.string().max(100))
      .max(500)
      .openapi({ example: ["sticker-star", "top-02"] }),
  })
  .openapi("Seen");

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

/** The most records one `POST /play-records` takes. */
export const playRecordBatchMax = 25;

const playRecordBase = {
  id: z.string().min(1).max(100).openapi({
    description:
      "Made by the play shell; the idempotency key. A record already stored is skipped.",
  }),
  play: z
    .string()
    .min(1)
    .max(100)
    .openapi({ description: "Groups one play's records" }),
  student: z.string().openapi({
    description: "Must be the signed-in student, or the batch is refused",
  }),
  class: z.string().openapi({
    description:
      "The class the play was opened for, which the student must be in",
  }),
  game: z.string().openapi({ example: "fraction-hop" }),
  gameVersion: z.number().int(),
  tier: z.string().openapi({ example: "g4" }),
  at: z.iso.datetime({ offset: true }).openapi({
    description:
      "When it happened, by the device's clock. Trusted over when it arrives.",
  }),
};

export const AttemptRecordSchema = z
  .object({
    ...playRecordBase,
    kind: z.literal("attempt"),
    task: z
      .string()
      .min(1)
      .max(100)
      .openapi({ description: "The same across retries of one task" }),
    expectation: z.string().openapi({ example: "math-2020.g4.B1.6" }),
    succeeded: z.boolean(),
    misconception: z.string().optional(),
    assisted: z.enum(["hint", "demonstration", "guided"]).optional(),
    asked: z.string().max(teacherTextMaxLength).optional().openapi({
      description:
        "What the task asked, for teachers: plain text, fractions as a/b. The same on every attempt at the task within a play",
    }),
    detail: z.string().max(teacherTextMaxLength).optional().openapi({
      description:
        "What the student did on this try, for teachers: plain text, fractions as a/b",
    }),
    exploring: z.boolean().optional().openapi({
      description:
        "A try that only explored: never succeeded, no misconception or help, and never scored",
    }),
  })
  .openapi("AttemptRecord", { description: "One try at one task" });

export const PlayEndRecordSchema = z
  .object({
    ...playRecordBase,
    kind: z.literal("end"),
    ending: z.enum(["finished", "left", "crashed"]),
  })
  .openapi("PlayEndRecord", {
    description: "How a play ended: at most one per play, after its attempts",
  });

export const PlayRecordSchema = z
  .discriminatedUnion("kind", [AttemptRecordSchema, PlayEndRecordSchema])
  .openapi("PlayRecord");

export type PlayRecord = z.infer<typeof PlayRecordSchema>;

export const PlayRecordBatchSchema = z
  .array(PlayRecordSchema)
  .max(playRecordBatchMax)
  .openapi("PlayRecordBatch", {
    description: `At most ${playRecordBatchMax} records, in the order the shell made them`,
  });

export const PlayRecordsStoredSchema = z
  .object({
    stored: z.number().int().openapi({
      description:
        "How many of the batch's records were new; the rest were already stored",
    }),
  })
  .openapi("PlayRecordsStored");

export const UnderstandingSchema = z
  .enum(["not-yet-showing", "developing", "showing-consistently"])
  .openapi("Understanding", {
    description:
      "How well a student's plays show understanding of an expectation. Descriptive bands, never a mark or an achievement level.",
  });

export const ResultSchema = z
  .object({
    expectation: z.string().openapi({
      description: "With its curriculum edition",
      example: "math-2020.g4.B1.6",
    }),
    understanding: UnderstandingSchema,
    tierGrade: z.number().int().openapi({
      description: "The grade of the tier the evidence was earned at",
    }),
    otherTier: z.boolean().openapi({
      description:
        "Earned at a tier other than the student's grade in the class",
    }),
    games: z
      .array(
        z.object({
          slug: z.string(),
          tier: z.string(),
          version: z.number().int(),
        }),
      )
      .openapi({ description: "The games, tiers and versions it came from" }),
  })
  .openapi("Result");

export type Result = z.infer<typeof ResultSchema>;

export const DashboardExpectationSchema = z
  .object({
    id: z.string().openapi({ example: "math-2020.g4.B1.6" }),
    grade: z.number().int(),
    code: z.string().openapi({ example: "B1.6" }),
    description: z
      .string()
      .openapi({ description: "Kindling's own words; never the ministry's" }),
  })
  .openapi("DashboardExpectation");

export const RecognitionTraitSchema = z
  .enum(recognitionTraits)
  .openapi("RecognitionTrait", {
    description:
      "A character trait a teacher recognises a student for (provisional configuration, in @repo/rewards)",
  });

export const RecogniseSchema = z
  .object({ trait: RecognitionTraitSchema })
  .openapi("Recognise");

export const RecognitionSchema = z
  .object({
    trait: RecognitionTraitSchema,
    awardedAt: z.string().openapi({
      description: "When the teacher gave it, as an ISO date-time",
    }),
  })
  .openapi("Recognition");

export type Recognition = z.infer<typeof RecognitionSchema>;

export const RecognitionSettingsSchema = z
  .object({
    term: z
      .object({
        start: z.string().openapi({ example: "2026-09-01" }),
        end: z.string().openapi({ example: "2027-01-31" }),
      })
      .openapi({
        description:
          "This term's first and last days, as ISO dates. Between terms, the term that ended last.",
      }),
    traits: z
      .array(z.object({ trait: RecognitionTraitSchema, name: z.string() }))
      .openapi({
        description: "The traits a teacher can recognise, as teachers see them",
      }),
  })
  .openapi("RecognitionSettings");

export type RecognitionSettings = z.infer<typeof RecognitionSettingsSchema>;

export const DashboardStudentSchema = z
  .object({
    id: z.string(),
    firstName: z.string(),
    lastInitial: z.string(),
    grade: z.union([z.number().int(), z.null()]).openapi({
      description: "Their grade in the class; null until picked",
    }),
    results: z.array(ResultSchema).openapi({
      description:
        "One per expectation they have evidence for. An expectation with none has no evidence yet.",
    }),
    recognised: z.array(RecognitionTraitSchema).openapi({
      description:
        "The traits they were recognised for in this class this term; none when they haven't been yet",
    }),
  })
  .openapi("DashboardStudent");

const StudentNameSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastInitial: z.string(),
});

export const MisconceptionSchema = z
  .object({
    game: z.string().openapi({ example: "fraction-hop" }),
    gameName: z.string().openapi({ example: "Fraction Hop" }),
    id: z.string().openapi({
      description: "The game's own name for it",
      example: "bigger-denominator-bigger",
    }),
    description: z.string().openapi({
      description: "The wrong idea in a sentence, in the game's words",
    }),
  })
  .openapi("Misconception");

export const ClassMisconceptionSchema = MisconceptionSchema.extend({
  students: z
    .array(
      StudentNameSchema.extend({
        expectation: z.string().openapi({
          description:
            "The expectation of the latest attempt that revealed it, whose evidence shows it",
        }),
      }),
    )
    .openapi({ description: "Who showed it, by first name then last initial" }),
}).openapi("ClassMisconception");

export const DashboardSchema = z
  .object({
    expectations: z.array(DashboardExpectationSchema).openapi({
      description:
        "What the class's games evidence at its grades, by grade then code",
    }),
    students: z.array(DashboardStudentSchema).openapi({
      description: "By first name, then last initial",
    }),
    misconceptions: z.array(ClassMisconceptionSchema).openapi({
      description:
        "The misconceptions revealed in the students' recent plays, the one most students showed first",
    }),
    recognition: RecognitionSettingsSchema,
  })
  .openapi("Dashboard");

export type Dashboard = z.infer<typeof DashboardSchema>;

const EndingSchema = z
  .union([z.enum(["finished", "left", "crashed"]), z.null()])
  .openapi({
    description:
      "How the play ended; null while it's going, or until its end arrives",
  });

const playBase = {
  play: z.string().openapi({ description: "The play's ID" }),
  game: z.string().openapi({ example: "fraction-hop" }),
  gameName: z.string().openapi({ example: "Fraction Hop" }),
  tier: z.string().openapi({ example: "g4" }),
  tierGrade: z.number().int(),
  version: z.number().int().openapi({ description: "The game's version" }),
  at: z.iso.datetime().openapi({
    description: "When it started, by the device's clock",
  }),
  ending: EndingSchema,
};

export const EvidencePlaySchema = z
  .object({
    ...playBase,
    tasks: z.number().int().openapi({
      description: "The tasks with attempts at this expectation",
    }),
    onTheirOwn: z
      .number()
      .int()
      .openapi({ description: "Tasks succeeded at without help" }),
    withHelp: z
      .number()
      .int()
      .openapi({ description: "Tasks succeeded at only with help" }),
    notYet: z
      .number()
      .int()
      .openapi({ description: "Tasks never succeeded at" }),
    tries: z.number().int().openapi({
      description: "Attempts at the tasks, retries included; not explored ones",
    }),
    explored: z.number().int().openapi({
      description: "Tries that only explored, which are never scored",
    }),
    misconceptions: z.array(MisconceptionSchema).openapi({
      description: "Revealed in the play, in the order first revealed",
    }),
    counts: z.boolean().openapi({
      description:
        "Whether the result counts it: only the most recent plays at a tier do, and never a crashed one",
    }),
  })
  .openapi("EvidencePlay");

export const EvidenceSchema = z
  .object({
    student: StudentNameSchema.extend({
      grade: z.union([z.number().int(), z.null()]),
    }),
    expectation: DashboardExpectationSchema,
    results: z.array(ResultSchema).openapi({
      description:
        "Their understanding at each tier they have evidence from, their own grade's first",
    }),
    plays: z.array(EvidencePlaySchema).openapi({
      description: "Every play with evidence for it, newest first",
    }),
  })
  .openapi("Evidence");

export type Evidence = z.infer<typeof EvidenceSchema>;

export const PlayAttemptSchema = z
  .object({
    at: z.iso.datetime().openapi({ description: "By the device's clock" }),
    succeeded: z.boolean(),
    exploring: z.boolean().openapi({
      description: "A try that only explored: never scored, never wrong",
    }),
    detail: z.union([z.string(), z.null()]).openapi({
      description:
        "What the student did on this try, as the game wrote it; fractions as a/b",
    }),
    assisted: z.union([z.enum(["hint", "demonstration", "guided"]), z.null()]),
    misconception: z.union([MisconceptionSchema, z.null()]),
  })
  .openapi("PlayAttempt");

export const PlaySchema = z
  .object({
    ...playBase,
    student: StudentNameSchema,
    tasks: z
      .array(
        z.object({
          task: z.string(),
          expectation: z.string(),
          asked: z.union([z.string(), z.null()]).openapi({
            description:
              "What the task asked, as the game wrote it (fractions as a/b), from its first attempt that said",
          }),
          attempts: z.array(PlayAttemptSchema).openapi({
            description: "In order; every one after the first is a retry",
          }),
        }),
      )
      .openapi({ description: "In the order each was first tried" }),
  })
  .openapi("Play");

export type Play = z.infer<typeof PlaySchema>;

export const EffortSkillSchema = z
  .object({
    skill: z.enum(
      Object.keys(learningSkills) as [LearningSkill, ...LearningSkill[]],
    ),
    name: z.string().openapi({ example: "Self-Regulation" }),
    evidence: z
      .array(
        z.object({
          kind: z.enum(["improvedAfterMistake", "finishedPlays"]).openapi({
            description:
              "improvedAfterMistake: tasks failed and later succeeded at in the same play. finishedPlays: plays finished.",
          }),
          count: z.number().int(),
        }),
      )
      .openapi({ description: "Each kind of effort evidence for the skill" }),
  })
  .openapi("EffortSkill");

export const StudentPageSchema = z
  .object({
    student: StudentNameSchema.extend({
      grade: z.union([z.number().int(), z.null()]),
    }),
    effort: z.array(EffortSkillSchema).openapi({
      description:
        "Their effort evidence for each Learning Skill it's evidence of, in the curriculum's order, from every play of theirs for the class but crashed ones. Raw attempts and time spent never count.",
    }),
    results: z
      .array(
        z.object({
          expectation: DashboardExpectationSchema,
          result: ResultSchema,
        }),
      )
      .openapi({
        description:
          "Their dashboard row's results: one per expectation they have evidence for, by grade then code",
      }),
    recognised: z.array(RecognitionSchema).openapi({
      description:
        "Every recognition they were given in this class, newest first",
    }),
    recognition: RecognitionSettingsSchema,
  })
  .openapi("StudentPage");

export type StudentPage = z.infer<typeof StudentPageSchema>;
