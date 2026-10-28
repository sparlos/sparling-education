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
import { type IdentityVerifier, identityFrom } from "./identity.ts";
import {
  type Account,
  AccountSchema,
  ClassSchema,
  ErrorSchema,
  HealthSchema,
  NewClassSchema,
  SignedInSchema,
  SignInSchema,
  UnhealthySchema,
} from "./schemas.ts";

export const openApiConfig = {
  openapi: "3.1.0",
  info: { title: "Kindling API", version: "0.0.0" },
};

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
      const token = await startSession(db, account.id);
      setCookie(c, sessionCookie.name, token, {
        httpOnly: true,
        sameSite: "Lax",
        secure: secureCookies,
        path: "/",
        maxAge: sessionCookie.maxAgeSeconds,
      });
      return c.json(
        { account, returnTo: sameOriginPath(returnTo, homes[as]) },
        200,
      );
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
    });

  app.doc31("/openapi.json", openApiConfig);
  if (apiReference) app.get("/reference", Scalar({ url: "/openapi.json" }));

  return app;
}

export type App = ReturnType<typeof createApp>;
