// STAND-IN for the real links port. There's no sign-in page and no locker
// yet, so sign-in goes to the shell's own stand-in screen and the hub to a
// stand-in placeholder, until the locker replaces it (ticket 09). See
// ../README.md.
import type { LinksPort } from "../ports.ts";

/** The stand-in sign-in screen's path, under the shell's base path. */
export const standInSignInPath = "__stand-in/sign-in";

/** The stand-in placeholder the hub link goes to, under the shell's base path. */
export const standInHubPath = "__stand-in/hub";

export function standInLinks(options: {
  /** The shell's base path, e.g. "/play/". */
  base: string;
}): LinksPort {
  return {
    signIn(returnTo) {
      return `${options.base}${standInSignInPath}?${new URLSearchParams({ next: returnTo })}`;
    },
    hub({ portal, play }) {
      return `${options.base}${standInHubPath}?${new URLSearchParams({ portal, play })}`;
    },
  };
}
