// STAND-IN for the real links port. There's no sign-in page, and the path the
// class world is served at on the shared domain is decided at deployment, so
// sign-in goes to the shell's own stand-in screen and the hub is the hubworld
// dev server. Replace with the deployed paths; see ../README.md.
import type { LinksPort } from "../ports.ts";

/** The stand-in sign-in screen's path, under the shell's base path. */
export const standInSignInPath = "__stand-in/sign-in";

export function standInLinks(options: {
  /** The shell's base path, e.g. "/play/". */
  base: string;
  /** Where the class world is running, e.g. "http://localhost:3001/". */
  hubUrl: string;
}): LinksPort {
  return {
    signIn(returnTo) {
      return `${options.base}${standInSignInPath}?${new URLSearchParams({ next: returnTo })}`;
    },
    hub({ portal, play }) {
      const url = new URL(options.hubUrl);
      url.searchParams.set("portal", portal);
      url.searchParams.set("play", play);
      return url.toString();
    },
  };
}
