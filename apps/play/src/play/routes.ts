/**
 * What a game link asks for: /play/<slug>, plus ?join=<code> on a teacher's
 * game link, or ?class=<id> from the locker.
 */
export interface GameLink {
  slug: string;
  /** The class it was opened for, from the locker, or null. */
  classId: string | null;
  /** The join code of a teacher's game link, whose class it's played for; or null. */
  joinCode: string | null;
}

/** A page of the shell. */
export type Route =
  /** The student's locker, at the shell's base path. */
  | { kind: "locker" }
  /** Google sign-in, on the real platform: /play/sign-in. */
  | { kind: "sign-in" }
  /** The wardrobe, from the locker: /play/wardrobe. */
  | { kind: "wardrobe" }
  /** The class join link: /play/join/<code>. */
  | { kind: "join"; joinCode: string }
  | { kind: "game"; link: GameLink };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const joinCodePattern = /^[A-Za-z0-9]{1,20}$/;

/** The page a URL names, or null if it names none. `base` is the shell's base path, e.g. "/play/". */
export function parseRoute(url: URL, base: string): Route | null {
  if (url.pathname === base || `${url.pathname}/` === base)
    return { kind: "locker" };
  if (!url.pathname.startsWith(base)) return null;
  const path = url.pathname.slice(base.length).replace(/\/$/, "");
  if (path === "sign-in") return { kind: "sign-in" };
  if (path === "wardrobe") return { kind: "wardrobe" };
  const [first, joinCode, ...rest] = path.split("/");
  if (first === "join")
    return joinCode && joinCodePattern.test(joinCode) && rest.length === 0
      ? { kind: "join", joinCode }
      : null;
  const link = parseGameLink(url, base);
  return link && { kind: "game", link };
}

/** The game link a URL names, or null if it doesn't name one. `base` is the shell's base path, e.g. "/play/". */
export function parseGameLink(url: URL, base: string): GameLink | null {
  if (!url.pathname.startsWith(base)) return null;
  const slug = url.pathname.slice(base.length).replace(/\/$/, "");
  if (!slugPattern.test(slug) || shellPages.includes(slug)) return null;
  return {
    slug,
    classId: url.searchParams.get("class") || null,
    joinCode: url.searchParams.get("join") || null,
  };
}

// The shell's own pages under its base, which no game slug can be.
const shellPages = ["sign-in", "wardrobe"];

/** The wardrobe's path, e.g. "/play/wardrobe". */
export function wardrobePath(base: string) {
  return `${base}wardrobe`;
}

/** The locker, naming the play the student is back from, so it can reveal what the play earned. */
export function lockerPath(base: string, play: string) {
  return `${base}?${new URLSearchParams({ play })}`;
}

/** The game link the locker opens: one game, for one of the student's classes. */
export function lockerGamePath(base: string, slug: string, classId: string) {
  return `${base}${slug}?${new URLSearchParams({ class: classId })}`;
}

/**
 * `path` when it's a page of the shell, with its query, or null. Sign-in only
 * returns to these, so a stored destination can't send anyone off the shell.
 */
export function shellPath(path: unknown, base: string): string | null {
  if (typeof path !== "string" || !path.startsWith(base)) return null;
  const origin = "https://kindling.invalid";
  const url = new URL(path, origin);
  if (url.origin !== origin || !url.pathname.startsWith(base)) return null;
  return url.pathname + url.search;
}

/** Where to come back to after sign-in: the link exactly as opened. */
export function returnPath(url: URL): string {
  return url.pathname + url.search;
}

/** The prototype lab's path under the shell's base, e.g. "/play/lab". Dev only. */
export function labPath(base: string): string {
  return `${base}lab`;
}

/** Whether a URL is in the prototype lab: the list or one prototype. */
export function isLabUrl(url: URL, base: string): boolean {
  const lab = labPath(base);
  return url.pathname === lab || url.pathname.startsWith(`${lab}/`);
}
