// Accounts and sessions. An account is one Google account with one role for
// good; a session is one signed-in browser, held in an HTTP-only cookie.

import { createHash, randomBytes } from "node:crypto";
import type { Db } from "@repo/db";
import type { Identity } from "./identity.ts";
import type { Account } from "./schemas.ts";

export type Role = Account["role"];

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

export const sessionCookie = {
  name: "kindling_session",
  maxAgeSeconds: sessionLifetimeMs / 1000,
};

/**
 * The account for a Google identity, made with `role` if it's new. An existing
 * account keeps its role whatever the entry point, and takes the latest names.
 */
export async function accountFor(
  db: Db,
  identity: Identity,
  role: Role,
): Promise<Account> {
  const { subject, firstName, lastInitial } = identity;
  const account = await db.account.upsert({
    where: { googleSubject: subject },
    create: { googleSubject: subject, role, firstName, lastInitial },
    update: { firstName, lastInitial },
  });
  return toAccount(account);
}

/** Starts a session for the account, returning the token for its cookie. */
export async function startSession(db: Db, accountId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      tokenHash: hash(token),
      accountId,
      expiresAt: new Date(Date.now() + sessionLifetimeMs),
    },
  });
  return token;
}

/** The account signed in with this session token, or null when it isn't a live session. */
export async function sessionAccount(
  db: Db,
  token: string | undefined,
): Promise<Account | null> {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { account: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return toAccount(session.account);
}

export async function endSession(db: Db, token: string | undefined) {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: hash(token) } });
}

/**
 * `returnTo` when it's a path on this domain, otherwise `fallback`, so sign-in
 * can never send anyone to another site.
 */
export function sameOriginPath(returnTo: string | undefined, fallback: string) {
  if (!returnTo?.startsWith("/")) return fallback;
  const origin = "https://kindling.invalid";
  const url = new URL(returnTo, origin);
  const path = `${url.pathname}${url.search}${url.hash}`;
  // "//host" would be read as another site's address.
  if (url.origin !== origin || path.startsWith("//")) return fallback;
  return path;
}

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toAccount(account: {
  id: string;
  role: Role;
  firstName: string;
  lastInitial: string;
}): Account {
  const { id, role, firstName, lastInitial } = account;
  return { id, role, firstName, lastInitial };
}
