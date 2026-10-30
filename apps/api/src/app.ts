import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { Db } from "@repo/db";
import { Scalar } from "@scalar/hono-api-reference";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import {
  accountFor,
  endSession,
  sameOriginPath,
  sessionAccount,
  sessionCookie,
  startSession,
  viewingAs,
} from "./accounts.ts";
import {
  createClass,
  setClassColour,
  setGameOn,
  teacherClass,
  teacherClasses,
} from "./classes.ts";
import { classDashboard } from "./dashboard.ts";
import { deleteDemoClass, giveDemoClass, viewDemoAsStudent } from "./demo.ts";
import { studentEvidence, studentPlay } from "./drill-down.ts";
import { type IdentityVerifier, identityFrom } from "./identity.ts";
import {
  markSeen,
  markSeenInWardrobe,
  placeStickers,
  studentLocker,
  wearLook,
} from "./locker.ts";
import {
  classStudents,
  joinClass,
  pickGrade,
  removeStudent,
  setStudentGrade,
} from "./memberships.ts";
import { hasPlayed, ingestPlayRecords } from "./play-records.ts";
import { classQuickAssess, studentQuickAssess } from "./quick-assess.ts";
import { recognise } from "./recognition.ts";
import {
  type Account,
  AccountSchema,
  ClassColourChangeSchema,
  ClassSchema,
  ClassStudentSchema,
  DashboardSchema,
  DemoViewSchema,
  ErrorSchema,
  EvidenceSchema,
  GameSwitchSchema,
  GradePickSchema,
  HealthSchema,
  JoinSchema,
  LockerSchema,
  LookSchema,
  MembershipSchema,
  NewClassSchema,
  PlacementsSchema,
  PlayedSchema,
  PlayRecordBatchSchema,
  PlayRecordsStoredSchema,
  PlaySchema,
  QuickAssessSchema,
  QuickAssessStudentSchema,
  RecogniseSchema,
  RecognitionSchema,
  SeenSchema,
  SignedInSchema,
  SignInSchema,
  StudentPageSchema,
  StudentSchema,
  StudentSignInSchema,
  UnhealthySchema,
  WalkthroughsSchema,
} from "./schemas.ts";
import { studentSession } from "./session.ts";
import { studentPage } from "./student-page.ts";
import { markWalkthroughSeen, seenWalkthroughs } from "./walkthroughs.ts";

export const openApiConfig = {
  openapi: "3.1.0",
  info: { title: "Kindling API", version: "0.0.0" },
};

// Where student sign-in sends the browser back to. The play shell remembers
// where the student was headed, so no destination has to survive Google.
const studentSignInPage = "/play/sign-in";

// The cookie Google's sign-in library sets, to match against the form field.
const googleCsrfCookie = "g_csrf_token";

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  operationId: "getHealth",
  summary: "Whether the API and its database are up",
  responses: {
    200: {
      description: "The API is serving requests and can reach its database",
      content: { "application/json": { schema: HealthSchema } },
    },
    503: {
      description: "The API can't reach its database",
      content: { "application/json": { schema: UnhealthySchema } },
    },
  },
});

const signInRoute = createRoute({
  method: "post",
  path: "/sign-in",
  operationId: "signIn",
  summary: "Sign in with a Google ID token",
  description:
    "Verifies the token, makes the account if it's new, and starts a session in an HTTP-only cookie. Kindling keeps only Google's subject ID, the first name and the last initial. A teacher's first sign-in gives them their demo class.",
  request: {
    body: { content: { "application/json": { schema: SignInSchema } } },
  },
  responses: {
    200: {
      description: "Signed in",
      content: { "application/json": { schema: SignedInSchema } },
    },
    401: {
      description: "The token isn't a valid Google sign-in for Kindling",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const studentSignInRoute = createRoute({
  method: "post",
  path: "/sign-in/student",
  operationId: "signInStudent",
  summary: "Sign a student in with Google's redirect-mode sign-in",
  description:
    "Google posts its ID token here as a form (Google's `login_uri`). Checks Google's double-submit cookie, verifies the token, makes a student if the account is new, starts a session, and sends the browser back to the play shell's sign-in page, which goes on to where the student was headed. An existing account keeps its role.",
  request: {
    body: {
      content: {
        "application/x-www-form-urlencoded": { schema: StudentSignInSchema },
      },
    },
  },
  responses: {
    303: {
      description: `Back to ${studentSignInPage}: signed in, or with \`?failed\` when the sign-in was rejected`,
    },
  },
});

const signOutRoute = createRoute({
  method: "post",
  path: "/sign-out",
  operationId: "signOut",
  summary: "End this browser's session",
  responses: { 204: { description: "Signed out" } },
});

const accountRoute = createRoute({
  method: "get",
  path: "/account",
  operationId: "getAccount",
  summary: "Who is signed in",
  responses: {
    200: {
      description: "The signed-in account, or null when signed out",
      content: {
        "application/json": { schema: z.union([AccountSchema, z.null()]) },
      },
    },
  },
});

const sessionRoute = createRoute({
  method: "get",
  path: "/session",
  operationId: "getSession",
  summary: "The signed-in student, as the play shell needs them",
  description:
    "Every student route acts as the signed-in student, or as the demo student a teacher is viewing as.",
  responses: {
    200: {
      description: "The signed-in student, or null when signed out",
      content: {
        "application/json": { schema: z.union([StudentSchema, z.null()]) },
      },
    },
    403: {
      description: "Signed in, but not as a student",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

// Every student route answers these when the browser isn't a student's.
const studentOnly = {
  401: {
    description: "Not signed in",
    content: { "application/json": { schema: ErrorSchema } },
  },
  403: {
    description: "Signed in, but not as a student",
    content: { "application/json": { schema: ErrorSchema } },
  },
};

const joinRoute = createRoute({
  method: "post",
  path: "/memberships",
  operationId: "joinClass",
  summary: "Join the signed-in student to a class",
  description:
    "Joining a class they're already in changes nothing. In a single-grade class the student's grade is set; in a split class it stays null until they pick one.",
  request: {
    body: { content: { "application/json": { schema: JoinSchema } } },
  },
  responses: {
    200: {
      description: "The student's membership of the class",
      content: { "application/json": { schema: MembershipSchema } },
    },
    ...studentOnly,
    404: {
      description:
        "No class has that join code, or the student is a demo student and it isn't their demo class",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const gradeRoute = createRoute({
  method: "put",
  path: "/memberships/{classId}/grade",
  operationId: "pickGrade",
  summary: "The student picks their grade in a split class",
  description:
    "Once only, from the class's grades. After that only their teacher can change it.",
  request: {
    params: z.object({ classId: z.uuid() }),
    body: { content: { "application/json": { schema: GradePickSchema } } },
  },
  responses: {
    200: {
      description: "The student's membership, with their grade",
      content: { "application/json": { schema: MembershipSchema } },
    },
    400: {
      description: "Not one of the class's grades",
      content: { "application/json": { schema: ErrorSchema } },
    },
    ...studentOnly,
    404: {
      description: "The student isn't in that class",
      content: { "application/json": { schema: ErrorSchema } },
    },
    409: {
      description: "The student's grade in that class is already set",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const lockerRoute = createRoute({
  method: "get",
  path: "/locker",
  operationId: "getLocker",
  summary: "The signed-in student's locker",
  responses: {
    200: {
      description: "What's in their locker",
      content: { "application/json": { schema: LockerSchema } },
    },
    ...studentOnly,
  },
});

const wearRoute = createRoute({
  method: "put",
  path: "/locker/look",
  operationId: "wearLook",
  summary: "Dress the signed-in student's avatar",
  description:
    "Saves their look: the first time when they design their avatar, then from the wardrobe. Skin tones and hair are anyone's; outfit pieces must be ones they own.",
  request: {
    body: { content: { "application/json": { schema: LookSchema } } },
  },
  responses: {
    200: {
      description: "The look they now wear",
      content: { "application/json": { schema: LookSchema } },
    },
    400: {
      description: "An outfit piece in the look isn't theirs",
      content: { "application/json": { schema: ErrorSchema } },
    },
    ...studentOnly,
  },
});

const seenRoute = createRoute({
  method: "post",
  path: "/locker/seen",
  operationId: "markRewardsSeen",
  summary: "The signed-in student has seen these rewards revealed",
  description:
    "They stop being new in the locker. Rewards the student hasn't got, or has already seen, are ignored.",
  request: {
    body: { content: { "application/json": { schema: SeenSchema } } },
  },
  responses: {
    204: { description: "Marked as seen" },
    ...studentOnly,
  },
});

const wardrobeSeenRoute = createRoute({
  method: "post",
  path: "/locker/wardrobe-seen",
  operationId: "markSeenInWardrobe",
  summary: "The signed-in student has seen these outfit pieces in the wardrobe",
  description:
    "They opened the slot holding them, so they stop being new in the wardrobe. Seeing them revealed in the locker doesn't change this, and this doesn't change that. Pieces the student hasn't got, or has already seen there, are ignored.",
  request: {
    body: { content: { "application/json": { schema: SeenSchema } } },
  },
  responses: {
    204: { description: "Marked as seen in the wardrobe" },
    ...studentOnly,
  },
});

const placementsRoute = createRoute({
  method: "put",
  path: "/locker/stickers",
  operationId: "placeStickers",
  summary: "Put the signed-in student's stickers on their locker",
  description:
    "Every sticker on their locker, and where, replacing what was there: stickers left out are taken off. Each must be one they own. Only the student changes their own locker.",
  request: {
    body: { content: { "application/json": { schema: PlacementsSchema } } },
  },
  responses: {
    200: {
      description: "The stickers now on their locker",
      content: { "application/json": { schema: PlacementsSchema } },
    },
    400: {
      description: "A sticker isn't theirs, or is placed twice",
      content: { "application/json": { schema: ErrorSchema } },
    },
    ...studentOnly,
  },
});

const playRecordsRoute = createRoute({
  method: "post",
  path: "/play-records",
  operationId: "sendPlayRecords",
  summary: "Store a batch of the signed-in student's play records",
  description:
    "Idempotent by record ID: records already stored are skipped, so a resent batch is safe. A play's end grants the rewards its effort earned, up to the weekly cap. Records arrive in the order the shell made them, and can arrive days late; their `at` is trusted. Each is checked against the student's classes and the game's manifest at its version. A 4xx means the batch will never be accepted, and the shell drops it; anything else is worth retrying.",
  request: {
    body: {
      content: { "application/json": { schema: PlayRecordBatchSchema } },
    },
  },
  responses: {
    200: {
      description: "Stored",
      content: { "application/json": { schema: PlayRecordsStoredSchema } },
    },
    400: {
      description:
        "A record the student's classes or the game's manifest don't allow, a record added to a play that has ended, or more than 25 records",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "Not signed in",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description:
        "Signed in, but not as a student, or a record is another student's",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const playedRoute = createRoute({
  method: "get",
  path: "/games/{slug}/played",
  operationId: "hasPlayed",
  summary: "Whether the signed-in student has played this game before",
  description:
    "True once any record of a play of theirs has arrived, from any class, at any tier, including a play that crashed. The play shell plays a game's tutorial only when it's false. Records can arrive late, so a play on another device may not count yet.",
  request: {
    params: z.object({
      slug: z.string().min(1).max(100).openapi({ example: "fraction-hop" }),
    }),
  },
  responses: {
    200: {
      description: "Whether they've played it",
      content: { "application/json": { schema: PlayedSchema } },
    },
    ...studentOnly,
  },
});

// Every teacher route answers these when the browser isn't a teacher's.
const teacherOnly = {
  401: {
    description: "Not signed in",
    content: { "application/json": { schema: ErrorSchema } },
  },
  403: {
    description: "Signed in, but not as a teacher",
    content: { "application/json": { schema: ErrorSchema } },
  },
};

const classesRoute = createRoute({
  method: "get",
  path: "/classes",
  operationId: "getClasses",
  summary: "The signed-in teacher's classes",
  responses: {
    200: {
      description: "Their classes, oldest first",
      content: { "application/json": { schema: z.array(ClassSchema) } },
    },
    ...teacherOnly,
  },
});

const createClassRoute = createRoute({
  method: "post",
  path: "/classes",
  operationId: "createClass",
  summary: "Make a class for the signed-in teacher",
  description:
    "The class gets a join code, and every game Kindling hosts starts on.",
  request: {
    body: { content: { "application/json": { schema: NewClassSchema } } },
  },
  responses: {
    201: {
      description: "The new class",
      content: { "application/json": { schema: ClassSchema } },
    },
    ...teacherOnly,
  },
});

const classRoute = createRoute({
  method: "get",
  path: "/classes/{classId}",
  operationId: "getClass",
  summary: "One of the signed-in teacher's classes",
  request: { params: z.object({ classId: z.uuid() }) },
  responses: {
    200: {
      description: "The class",
      content: { "application/json": { schema: ClassSchema } },
    },
    ...teacherOnly,
    404: {
      description: "No class of this teacher's has that ID",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const gameSwitchRoute = createRoute({
  method: "put",
  path: "/classes/{classId}/games/{slug}",
  operationId: "switchGame",
  summary: "Turn one of a class's games on or off",
  description:
    "Students see only the games that are on, in their locker. A game link for one that's off tells them it's turned off. Turning it back on restores both.",
  request: {
    params: z.object({
      classId: z.uuid(),
      slug: z.string().min(1).max(100).openapi({ example: "fraction-hop" }),
    }),
    body: { content: { "application/json": { schema: GameSwitchSchema } } },
  },
  responses: {
    200: {
      description: "The class, with the game on or off",
      content: { "application/json": { schema: ClassSchema } },
    },
    ...teacherOnly,
    404: {
      description:
        "No class of this teacher's has that ID, or Kindling doesn't host that game",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const classColourRoute = createRoute({
  method: "put",
  path: "/classes/{classId}/colour",
  operationId: "setClassColour",
  summary: "Set a class's colour",
  description:
    "Every screen for the class takes its hue from it, for the teacher and in its students' lockers.",
  request: {
    params: z.object({ classId: z.uuid() }),
    body: {
      content: { "application/json": { schema: ClassColourChangeSchema } },
    },
  },
  responses: {
    200: {
      description: "The class, in its new colour",
      content: { "application/json": { schema: ClassSchema } },
    },
    400: {
      description: "Not one of the class colours",
      content: { "application/json": { schema: ErrorSchema } },
    },
    ...teacherOnly,
    404: {
      description: "No class of this teacher's has that ID",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const classStudentsRoute = createRoute({
  method: "get",
  path: "/classes/{classId}/students",
  operationId: "getClassStudents",
  summary: "A class's students, and their grade in it",
  request: { params: z.object({ classId: z.uuid() }) },
  responses: {
    200: {
      description: "The students, by first name then last initial",
      content: { "application/json": { schema: z.array(ClassStudentSchema) } },
    },
    ...teacherOnly,
    404: {
      description: "No class of this teacher's has that ID",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const studentGradeRoute = createRoute({
  method: "put",
  path: "/classes/{classId}/students/{studentId}/grade",
  operationId: "setStudentGrade",
  summary: "Change a student's grade in the class",
  description:
    "To one of the class's grades, whether or not the student picked one. Their next plays are at its tier; results they already have keep theirs.",
  request: {
    params: z.object({ classId: z.uuid(), studentId: z.uuid() }),
    body: { content: { "application/json": { schema: GradePickSchema } } },
  },
  responses: {
    200: {
      description: "The student, with their new grade",
      content: { "application/json": { schema: ClassStudentSchema } },
    },
    400: {
      description: "Not one of the class's grades",
      content: { "application/json": { schema: ErrorSchema } },
    },
    ...teacherOnly,
    404: {
      description:
        "No class of this teacher's has that ID, or the student isn't in it",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const removeStudentRoute = createRoute({
  method: "delete",
  path: "/classes/{classId}/students/{studentId}",
  operationId: "removeStudent",
  summary: "Remove a student from the class",
  description:
    "The class leaves their locker, and they leave its dashboard. Their plays for the class are kept out of every teacher view; they come back if the student joins again.",
  request: { params: z.object({ classId: z.uuid(), studentId: z.uuid() }) },
  responses: {
    204: { description: "Removed" },
    ...teacherOnly,
    404: {
      description:
        "No class of this teacher's has that ID, or the student isn't in it",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const dashboardRoute = createRoute({
  method: "get",
  path: "/classes/{classId}/dashboard",
  operationId: "getDashboard",
  summary: "A class's students against the expectations its games evidence",
  description:
    "Each student's understanding of each expectation, from their plays for this class. An expectation a student has no result for has no evidence yet.",
  request: { params: z.object({ classId: z.uuid() }) },
  responses: {
    200: {
      description: "The class's dashboard",
      content: { "application/json": { schema: DashboardSchema } },
    },
    ...teacherOnly,
    404: {
      description: "No class of this teacher's has that ID",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const studentPageRoute = createRoute({
  method: "get",
  path: "/classes/{classId}/students/{studentId}",
  operationId: "getStudentPage",
  summary:
    "A student's page: their effort by Learning Skill, and their results",
  description:
    "Effort counts tasks failed and later succeeded at in the same play, and finished plays, never raw attempts or time spent. A crashed play counts neither for nor against.",
  request: { params: z.object({ classId: z.uuid(), studentId: z.uuid() }) },
  responses: {
    200: {
      description: "The student's page",
      content: { "application/json": { schema: StudentPageSchema } },
    },
    ...teacherOnly,
    404: {
      description:
        "No class of this teacher's has that ID, or the student isn't in it",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const recogniseRoute = createRoute({
  method: "post",
  path: "/classes/{classId}/students/{studentId}/recognition",
  operationId: "recogniseStudent",
  summary: "Recognise a student for a character trait",
  description:
    "Gives the student the trait's exclusive recognition sticker, revealed as new in their locker. Once per trait per term in a class: recognising them for it again this term changes nothing. It never counts toward the weekly reward cap.",
  request: {
    params: z.object({ classId: z.uuid(), studentId: z.uuid() }),
    body: { content: { "application/json": { schema: RecogniseSchema } } },
  },
  responses: {
    200: {
      description: "The recognition, given now or earlier this term",
      content: { "application/json": { schema: RecognitionSchema } },
    },
    ...teacherOnly,
    404: {
      description:
        "No class of this teacher's has that ID, or the student isn't in it",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const evidenceRoute = createRoute({
  method: "get",
  path: "/classes/{classId}/students/{studentId}/expectations/{expectationId}",
  operationId: "getEvidence",
  summary: "A student's evidence for one expectation: a dashboard cell, opened",
  description:
    "Their understanding at each tier, and every play of theirs for the class with attempts at the expectation: its game, tier, how its tasks went and the misconceptions it revealed.",
  request: {
    params: z.object({
      classId: z.uuid(),
      studentId: z.uuid(),
      expectationId: z.string().openapi({ example: "math-2020.g4.B1.6" }),
    }),
  },
  responses: {
    200: {
      description: "The student's evidence",
      content: { "application/json": { schema: EvidenceSchema } },
    },
    ...teacherOnly,
    404: {
      description:
        "No class of this teacher's has that ID, the student isn't in it, or there's no such expectation",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const playRoute = createRoute({
  method: "get",
  path: "/classes/{classId}/students/{studentId}/plays/{play}",
  operationId: "getPlay",
  summary: "One of a student's plays, attempt by attempt",
  request: {
    params: z.object({
      classId: z.uuid(),
      studentId: z.uuid(),
      play: z.string().min(1).max(100),
    }),
  },
  responses: {
    200: {
      description: "The play",
      content: { "application/json": { schema: PlaySchema } },
    },
    ...teacherOnly,
    404: {
      description:
        "No class of this teacher's has that ID, the student isn't in it, or they have no such play for it",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const quickAssessRoute = createRoute({
  method: "get",
  path: "/classes/{classId}/quick-assess",
  operationId: "getQuickAssess",
  summary: "A class's quick assess, for writing report cards",
  description:
    "For each student: for each expectation, how many of its tasks they did on their own in their recent plays; the misconceptions those plays showed, as next steps; and their effort evidence by Learning Skill, which is reported separately. Counts only, never a level, rating or mark.",
  request: { params: z.object({ classId: z.uuid() }) },
  responses: {
    200: {
      description: "The class's quick assess",
      content: { "application/json": { schema: QuickAssessSchema } },
    },
    ...teacherOnly,
    404: {
      description: "No class of this teacher's has that ID",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const studentQuickAssessRoute = createRoute({
  method: "get",
  path: "/classes/{classId}/students/{studentId}/quick-assess",
  operationId: "getStudentQuickAssess",
  summary: "One student's quick assess, for writing their report card",
  description:
    "For each expectation, how many of its tasks they did on their own in their recent plays; the misconceptions those plays showed, as next steps; and their effort evidence by Learning Skill, which is reported separately. Counts only, never a level, rating or mark.",
  request: { params: z.object({ classId: z.uuid(), studentId: z.uuid() }) },
  responses: {
    200: {
      description: "The student's quick assess",
      content: { "application/json": { schema: QuickAssessStudentSchema } },
    },
    ...teacherOnly,
    404: {
      description:
        "No class of this teacher's has that ID, or the student isn't in it",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const deleteDemoRoute = createRoute({
  method: "delete",
  path: "/demo-class",
  operationId: "deleteDemoClass",
  summary: "Delete the signed-in teacher's demo class",
  description:
    "Deletes it, its simulated students and everything of theirs, in one step. It never comes back.",
  responses: {
    204: { description: "Deleted" },
    ...teacherOnly,
    404: {
      description: "The teacher has no demo class",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const viewDemoRoute = createRoute({
  method: "post",
  path: "/demo-class/view-as-student",
  operationId: "viewDemoAsStudent",
  summary: "View the play shell as one of the demo class's students",
  description:
    "From now on this browser's student routes act as that demo student, so the play shell opens their locker, and their plays count only in the demo class. Teacher routes are unchanged.",
  responses: {
    200: {
      description: "Who they're viewing as, and where to open the play shell",
      content: { "application/json": { schema: DemoViewSchema } },
    },
    ...teacherOnly,
    404: {
      description: "The teacher has no demo class",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const walkthroughsRoute = createRoute({
  method: "get",
  path: "/walkthroughs",
  operationId: "getWalkthroughs",
  summary: "The teacher app's walkthroughs the signed-in teacher has seen",
  description:
    "Finished or skipped, by the app's IDs. Each walkthrough starts by itself only until it's seen.",
  responses: {
    200: {
      description: "The walkthroughs they've seen",
      content: { "application/json": { schema: WalkthroughsSchema } },
    },
    ...teacherOnly,
  },
});

const walkthroughSeenRoute = createRoute({
  method: "put",
  path: "/walkthroughs/{walkthrough}",
  operationId: "markWalkthroughSeen",
  summary: "The signed-in teacher has finished or skipped a walkthrough",
  description:
    "It won't start by itself again, on any browser. Marking one already seen changes nothing.",
  request: {
    params: z.object({
      walkthrough: z
        .string()
        .regex(/^[a-z0-9-]{1,64}$/)
        .openapi({ example: "welcome" }),
    }),
  },
  responses: {
    204: { description: "Marked as seen" },
    400: {
      description: "Not a walkthrough ID, or the teacher has seen too many",
      content: { "application/json": { schema: ErrorSchema } },
    },
    ...teacherOnly,
  },
});

// Where each entry point lands when sign-in isn't given somewhere to return to.
const homes = { teacher: "/teach/" } as const;

export interface AppDeps {
  db: Db;
  /** Checks Google sign-ins; tests pass a fake. */
  identity: IdentityVerifier;
  /** Mark the session cookie Secure. Off only for plain-HTTP development. */
  secureCookies?: boolean;
  /** Serve the Scalar API reference at /reference. Development only. */
  apiReference?: boolean;
  /** The time now, for which term it is. Tests pass their own. */
  clock?: () => Date;
  /**
   * Give each new teacher a demo class at their first sign-in. Tests about
   * anything else turn it off, so a teacher starts with no classes.
   */
  demoClass?: boolean;
}

// Routes are chained so the app's type carries them, for `testClient`.
export function createApp({
  db,
  identity,
  secureCookies = true,
  apiReference = false,
  clock = () => new Date(),
  demoClass = true,
}: AppDeps) {
  const base = new OpenAPIHono();
  base.use("*", cors());

  /** The browser's teacher, or why it hasn't got one. */
  async function teacherOf(
    c: Context,
  ): Promise<Account | "signed-out" | "not-a-teacher"> {
    const account = await sessionAccount(db, getCookie(c, sessionCookie.name));
    if (!account) return "signed-out";
    return account.role === "teacher" ? account : "not-a-teacher";
  }

  /**
   * The browser's student, or the demo student its teacher is viewing as,
   * or why it hasn't got one.
   */
  async function studentOf(
    c: Context,
  ): Promise<Account | "signed-out" | "not-a-student"> {
    const token = getCookie(c, sessionCookie.name);
    const account = await sessionAccount(db, token);
    if (!account) return "signed-out";
    if (account.role === "student") return account;
    return (await viewingAs(db, token)) ?? "not-a-student";
  }

  async function startSessionCookie(c: Context, accountId: string) {
    const token = await startSession(db, accountId);
    setCookie(c, sessionCookie.name, token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: secureCookies,
      path: "/",
      maxAge: sessionCookie.maxAgeSeconds,
    });
  }

  const app = base
    .openapi(healthRoute, async (c) => {
      try {
        await db.$queryRaw`SELECT 1`;
        return c.json({ status: "ok" as const }, 200);
      } catch {
        return c.json({ status: "unavailable" as const }, 503);
      }
    })
    .openapi(signInRoute, async (c) => {
      const { credential, as, returnTo } = c.req.valid("json");
      const claims = await identity.verify(credential);
      if (!claims) return c.json({ error: "credential-rejected" }, 401);
      const account = await accountFor(db, identityFrom(claims), as);
      if (demoClass && account.role === "teacher")
        await giveDemoClass(db, account.id, clock());
      await startSessionCookie(c, account.id);
      return c.json(
        { account, returnTo: sameOriginPath(returnTo, homes[as]) },
        200,
      );
    })
    .openapi(studentSignInRoute, async (c) => {
      const { credential, g_csrf_token } = c.req.valid("form");
      const failed = () => c.redirect(`${studentSignInPage}?failed`, 303);
      // Another site can post a form here, but can't set this site's cookie.
      if (getCookie(c, googleCsrfCookie) !== g_csrf_token) return failed();
      const claims = await identity.verify(credential);
      if (!claims) return failed();
      const account = await accountFor(db, identityFrom(claims), "student");
      await startSessionCookie(c, account.id);
      return c.redirect(studentSignInPage, 303);
    })
    .openapi(signOutRoute, async (c) => {
      await endSession(db, getCookie(c, sessionCookie.name));
      deleteCookie(c, sessionCookie.name, { path: "/", secure: secureCookies });
      return c.body(null, 204);
    })
    .openapi(accountRoute, async (c) => {
      const account = await sessionAccount(
        db,
        getCookie(c, sessionCookie.name),
      );
      return c.json(account, 200);
    })
    .openapi(sessionRoute, async (c) => {
      const student = await studentOf(c);
      if (student === "signed-out") return c.json(null, 200);
      if (student === "not-a-student") return c.json({ error: student }, 403);
      return c.json(await studentSession(db, student), 200);
    })
    .openapi(joinRoute, async (c) => {
      const student = await studentOf(c);
      if (student === "signed-out") return c.json({ error: student }, 401);
      if (student === "not-a-student") return c.json({ error: student }, 403);
      const { joinCode } = c.req.valid("json");
      const membership = await joinClass(db, student.id, joinCode);
      if (!membership) return c.json({ error: "no-such-class" }, 404);
      return c.json(membership, 200);
    })
    .openapi(gradeRoute, async (c) => {
      const student = await studentOf(c);
      if (student === "signed-out") return c.json({ error: student }, 401);
      if (student === "not-a-student") return c.json({ error: student }, 403);
      const pick = await pickGrade(
        db,
        student.id,
        c.req.valid("param").classId,
        c.req.valid("json").grade,
      );
      switch (pick.kind) {
        case "picked":
          return c.json(pick.membership, 200);
        case "not-a-member":
          return c.json({ error: pick.kind }, 404);
        case "already-picked":
          return c.json({ error: pick.kind }, 409);
        case "not-a-class-grade":
          return c.json({ error: pick.kind }, 400);
      }
    })
    .openapi(lockerRoute, async (c) => {
      const student = await studentOf(c);
      if (student === "signed-out") return c.json({ error: student }, 401);
      if (student === "not-a-student") return c.json({ error: student }, 403);
      return c.json(await studentLocker(db, student.id), 200);
    })
    .openapi(wearRoute, async (c) => {
      const student = await studentOf(c);
      if (student === "signed-out") return c.json({ error: student }, 401);
      if (student === "not-a-student") return c.json({ error: student }, 403);
      const look = c.req.valid("json");
      if ((await wearLook(db, student.id, look)) === "not-owned")
        return c.json({ error: "not-owned" }, 400);
      return c.json(look, 200);
    })
    .openapi(seenRoute, async (c) => {
      const student = await studentOf(c);
      if (student === "signed-out") return c.json({ error: student }, 401);
      if (student === "not-a-student") return c.json({ error: student }, 403);
      await markSeen(db, student.id, c.req.valid("json").rewards);
      return c.body(null, 204);
    })
    .openapi(wardrobeSeenRoute, async (c) => {
      const student = await studentOf(c);
      if (student === "signed-out") return c.json({ error: student }, 401);
      if (student === "not-a-student") return c.json({ error: student }, 403);
      await markSeenInWardrobe(db, student.id, c.req.valid("json").rewards);
      return c.body(null, 204);
    })
    .openapi(placementsRoute, async (c) => {
      const student = await studentOf(c);
      if (student === "signed-out") return c.json({ error: student }, 401);
      if (student === "not-a-student") return c.json({ error: student }, 403);
      const { placements } = c.req.valid("json");
      if ((await placeStickers(db, student.id, placements)) === "not-owned")
        return c.json({ error: "not-owned" }, 400);
      return c.json({ placements }, 200);
    })
    .openapi(playRecordsRoute, async (c) => {
      const student = await studentOf(c);
      if (student === "signed-out") return c.json({ error: student }, 401);
      if (student === "not-a-student") return c.json({ error: student }, 403);
      const ingested = await ingestPlayRecords(
        db,
        student.id,
        c.req.valid("json"),
      );
      switch (ingested.kind) {
        case "stored":
          return c.json({ stored: ingested.stored }, 200);
        case "not-their-records":
          return c.json({ error: ingested.kind }, 403);
        case "refused":
          return c.json({ error: ingested.problem }, 400);
      }
    })
    .openapi(playedRoute, async (c) => {
      const student = await studentOf(c);
      if (student === "signed-out") return c.json({ error: student }, 401);
      if (student === "not-a-student") return c.json({ error: student }, 403);
      const { slug } = c.req.valid("param");
      return c.json({ played: await hasPlayed(db, student.id, slug) }, 200);
    })
    .openapi(classesRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      return c.json(await teacherClasses(db, teacher.id), 200);
    })
    .openapi(createClassRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      return c.json(
        await createClass(db, teacher.id, c.req.valid("json")),
        201,
      );
    })
    .openapi(classRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const found = await teacherClass(
        db,
        teacher.id,
        c.req.valid("param").classId,
      );
      if (!found) return c.json({ error: "no-such-class" }, 404);
      return c.json(found, 200);
    })
    .openapi(gameSwitchRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const { classId, slug } = c.req.valid("param");
      const switched = await setGameOn(
        db,
        teacher.id,
        classId,
        slug,
        c.req.valid("json").on,
      );
      if (!switched) return c.json({ error: "not-found" }, 404);
      return c.json(switched, 200);
    })
    .openapi(classColourRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const changed = await setClassColour(
        db,
        teacher.id,
        c.req.valid("param").classId,
        c.req.valid("json").colour,
      );
      if (!changed) return c.json({ error: "no-such-class" }, 404);
      return c.json(changed, 200);
    })
    .openapi(classStudentsRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const students = await classStudents(
        db,
        teacher.id,
        c.req.valid("param").classId,
      );
      if (!students) return c.json({ error: "no-such-class" }, 404);
      return c.json(students, 200);
    })
    .openapi(studentGradeRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const { classId, studentId } = c.req.valid("param");
      const change = await setStudentGrade(
        db,
        teacher.id,
        classId,
        studentId,
        c.req.valid("json").grade,
      );
      switch (change.kind) {
        case "changed":
          return c.json(change.student, 200);
        case "not-found":
          return c.json({ error: change.kind }, 404);
        case "not-a-class-grade":
          return c.json({ error: change.kind }, 400);
      }
    })
    .openapi(removeStudentRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const { classId, studentId } = c.req.valid("param");
      if (!(await removeStudent(db, teacher.id, classId, studentId)))
        return c.json({ error: "not-found" }, 404);
      return c.body(null, 204);
    })
    .openapi(dashboardRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const dashboard = await classDashboard(
        db,
        teacher.id,
        c.req.valid("param").classId,
        clock(),
      );
      if (!dashboard) return c.json({ error: "no-such-class" }, 404);
      return c.json(dashboard, 200);
    })
    .openapi(studentPageRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const { classId, studentId } = c.req.valid("param");
      const page = await studentPage(
        db,
        teacher.id,
        classId,
        studentId,
        clock(),
      );
      if (!page) return c.json({ error: "not-found" }, 404);
      return c.json(page, 200);
    })
    .openapi(recogniseRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const { classId, studentId } = c.req.valid("param");
      const given = await recognise(
        db,
        teacher.id,
        classId,
        studentId,
        c.req.valid("json").trait,
        clock(),
      );
      if (!given) return c.json({ error: "not-found" }, 404);
      return c.json(given, 200);
    })
    .openapi(evidenceRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const { classId, studentId, expectationId } = c.req.valid("param");
      const evidence = await studentEvidence(
        db,
        teacher.id,
        classId,
        studentId,
        expectationId,
      );
      if (!evidence) return c.json({ error: "not-found" }, 404);
      return c.json(evidence, 200);
    })
    .openapi(playRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const { classId, studentId, play } = c.req.valid("param");
      const found = await studentPlay(db, teacher.id, classId, studentId, play);
      if (!found) return c.json({ error: "not-found" }, 404);
      return c.json(found, 200);
    })
    .openapi(quickAssessRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const assessed = await classQuickAssess(
        db,
        teacher.id,
        c.req.valid("param").classId,
      );
      if (!assessed) return c.json({ error: "no-such-class" }, 404);
      return c.json(assessed, 200);
    })
    .openapi(studentQuickAssessRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const { classId, studentId } = c.req.valid("param");
      const assessed = await studentQuickAssess(
        db,
        teacher.id,
        classId,
        studentId,
      );
      if (!assessed) return c.json({ error: "not-found" }, 404);
      return c.json(assessed, 200);
    })
    .openapi(deleteDemoRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      if (!(await deleteDemoClass(db, teacher.id)))
        return c.json({ error: "no-demo-class" }, 404);
      return c.body(null, 204);
    })
    .openapi(viewDemoRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const view = await viewDemoAsStudent(
        db,
        teacher.id,
        getCookie(c, sessionCookie.name) ?? "",
      );
      if (!view) return c.json({ error: "no-demo-class" }, 404);
      return c.json(view, 200);
    })
    .openapi(walkthroughsRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      return c.json({ seen: await seenWalkthroughs(db, teacher.id) }, 200);
    })
    .openapi(walkthroughSeenRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const { walkthrough } = c.req.valid("param");
      if (!(await markWalkthroughSeen(db, teacher.id, walkthrough)))
        return c.json({ error: "too-many-walkthroughs" }, 400);
      return c.body(null, 204);
    });

  app.doc31("/openapi.json", openApiConfig);
  if (apiReference) app.get("/reference", Scalar({ url: "/openapi.json" }));

  return app;
}

export type App = ReturnType<typeof createApp>;
