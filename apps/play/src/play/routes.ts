/** What a game link asks for: /play/<slug>, plus ?portal=<id> when opened from a portal. */
export interface GameLink {
  slug: string;
  /** The portal the student came through, or null for a game link opened directly. */
  portal: string | null;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The game link a URL names, or null if it doesn't name one. `base` is the shell's base path, e.g. "/play/". */
export function parseGameLink(url: URL, base: string): GameLink | null {
  if (!url.pathname.startsWith(base)) return null;
  const slug = url.pathname.slice(base.length).replace(/\/$/, "");
  if (!slugPattern.test(slug)) return null;
  return { slug, portal: url.searchParams.get("portal") || null };
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
