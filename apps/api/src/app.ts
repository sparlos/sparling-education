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
} from "./accounts.ts";
import { createClass, teacherClass, teacherClasses } from "./classes.ts";
import { classDashboard } from "./dashboard.ts";
import { studentEvidence, studentPlay } from "./drill-down.ts";
import { type IdentityVerifier, identityFrom } from "./identity.ts";
import { studentLocker, wearLook } from "./locker.ts";
import { joinClass, pickGrade } from "./memberships.ts";
import { ingestPlayRecords } from "./play-records.ts";
import {
  type Account,
  AccountSchema,
  ClassSchema,
  DashboardSchema,
  ErrorSchema,
  EvidenceSchema,
  GradePickSchema,
  HealthSchema,
  JoinSchema,
  LockerSchema,
  LookSchema,
  MembershipSchema,
  NewClassSchema,
  PlayRecordBatchSchema,
  PlayRecordsStoredSchema,
  PlaySchema,
  SignedInSchema,
  SignInSchema,
  StudentSchema,
  StudentSignInSchema,
  UnhealthySchema,
} from "./schemas.ts";
import { studentSession } from "./session.ts";

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
    "Verifies the token, makes the account if it's new, and starts a session in an HTTP-only cookie. Kindling keeps only Google's subject ID, the first name and the last initial.",
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
      description: "No class has that join code",
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

const playRecordsRoute = createRoute({
  method: "post",
  path: "/play-records",
  operationId: "sendPlayRecords",
  summary: "Store a batch of the signed-in student's play records",
  description:
    "Idempotent by record ID: records already stored are skipped, so a resent batch is safe. Records arrive in the order the shell made them, and can arrive days late; their `at` is trusted. Each is checked against the student's classes and the game's manifest at its version. A 4xx means the batch will never be accepted, and the shell drops it; anything else is worth retrying.",
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
}

// Routes are chained so the app's type carries them, for `testClient`.
export function createApp({
  db,
  identity,
  secureCookies = true,
  apiReference = false,
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

  /** The browser's student, or why it hasn't got one. */
  async function studentOf(
    c: Context,
  ): Promise<Account | "signed-out" | "not-a-student"> {
    const account = await sessionAccount(db, getCookie(c, sessionCookie.name));
    if (!account) return "signed-out";
    return account.role === "student" ? account : "not-a-student";
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
    .openapi(dashboardRoute, async (c) => {
      const teacher = await teacherOf(c);
      if (teacher === "signed-out") return c.json({ error: teacher }, 401);
      if (teacher === "not-a-teacher") return c.json({ error: teacher }, 403);
      const dashboard = await classDashboard(
        db,
        teacher.id,
        c.req.valid("param").classId,
      );
      if (!dashboard) return c.json({ error: "no-such-class" }, 404);
      return c.json(dashboard, 200);
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
    });

  app.doc31("/openapi.json", openApiConfig);
  if (apiReference) app.get("/reference", Scalar({ url: "/openapi.json" }));

  return app;
}

export type App = ReturnType<typeof createApp>;
