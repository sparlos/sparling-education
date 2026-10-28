// The links port on Kindling's shared domain.
import type { LinksPort } from "../ports.ts";

/** The play shell's sign-in page, under its base path: Google sign-in. */
export const signInPath = "sign-in";

export function apiLinks(options: {
  /** The shell's base path, e.g. "/play/". */
  base: string;
}): LinksPort {
  return {
    signIn(returnTo) {
      return `${options.base}${signInPath}?${new URLSearchParams({ next: returnTo })}`;
    },
    // The class world is gone: back to the locker, which reveals the play's
    // rewards once ticket 14 adds them.
    hub({ play }) {
      return `${options.base}?${new URLSearchParams({ play })}`;
    },
  };
}
