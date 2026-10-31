// The links port on the platform's shared domain.
import { homePath } from "../../play/routes.ts";
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
    home: (play) => homePath(options.base, play),
  };
}
