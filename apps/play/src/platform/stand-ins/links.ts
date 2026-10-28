// STAND-IN for the real links port. There's no Google sign-in without the
// API, so sign-in goes to the shell's own stand-in screen. The locker is the
// shell's own. See ../README.md.
import { lockerPath } from "../../play/routes.ts";
import type { LinksPort } from "../ports.ts";

/** The stand-in sign-in screen's path, under the shell's base path. */
export const standInSignInPath = "__stand-in/sign-in";

export function standInLinks(options: {
  /** The shell's base path, e.g. "/play/". */
  base: string;
}): LinksPort {
  return {
    signIn(returnTo) {
      return `${options.base}${standInSignInPath}?${new URLSearchParams({ next: returnTo })}`;
    },
    locker: (play) => lockerPath(options.base, play),
  };
}
